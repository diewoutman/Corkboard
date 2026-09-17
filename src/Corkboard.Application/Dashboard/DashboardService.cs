using System.Text.Json;
using Corkboard.Application.Collections;
using Corkboard.Application.Common;
using Corkboard.Contracts.Dashboard;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainWidgetType = Corkboard.Domain.Entities.DashboardWidgetType;
using DomainWidgetScope = Corkboard.Domain.Entities.DashboardWidgetScope;

namespace Corkboard.Application.Dashboard;

public class DashboardService(CorkboardDbContext db) : IDashboardService
{
    /// <summary>Fixed number of columns the dashboard lays widgets out in — the client mirrors this.</summary>
    public const int ColumnCount = 3;

    public async Task<IReadOnlyList<DashboardWidgetResponse>> ListAsync(Guid familyId, Guid userId, DashboardWidgetScope scope, CancellationToken cancellationToken)
    {
        var domainScope = (DomainWidgetScope)scope;
        var widgets = await ScopedQuery(familyId, userId, domainScope).AsNoTracking()
            .OrderBy(w => w.SortOrder)
            .ToListAsync(cancellationToken);

        if (widgets.Count == 0 && domainScope == DomainWidgetScope.Personal)
        {
            // First visit — seed the one widget every earlier version of this page always showed.
            // Family dashboards start empty instead — they're opt-in, set up by an admin.
            var seeded = new Domain.Entities.DashboardWidget
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FamilyId = familyId,
                Type = DomainWidgetType.Navigation,
                Scope = DomainWidgetScope.Personal,
                SortOrder = 0,
                Span = ColumnCount,
                ShowPanel = true,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            db.DashboardWidgets.Add(seeded);
            await db.SaveChangesAsync(cancellationToken);
            widgets = [seeded];
        }

        return widgets.Select(ToResponse).ToList();
    }

    public async Task<Result<DashboardWidgetResponse>> CreateAsync(Guid familyId, Guid userId, bool isAdmin, CreateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (request.Scope == DashboardWidgetScope.Family && !isAdmin)
        {
            return Result<DashboardWidgetResponse>.Failure(AdminOnlyError);
        }

        if (!await CollectionValidation.ExistsAsync(db, familyId, request.CollectionId, cancellationToken))
        {
            return Result<DashboardWidgetResponse>.Failure(InvalidCollectionError);
        }

        var domainScope = (DomainWidgetScope)request.Scope;
        var nextSortOrder = 1 + await ScopedQuery(familyId, userId, domainScope)
            .Select(w => (int?)w.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var now = DateTimeOffset.UtcNow;
        var widget = new Domain.Entities.DashboardWidget
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FamilyId = familyId,
            Type = (DomainWidgetType)request.Type,
            Scope = domainScope,
            SortOrder = nextSortOrder,
            Span = 1,
            ShowPanel = request.ShowPanel,
            Config = ToConfigJson(request.TileOrder, request.TileKey, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.DashboardWidgets.Add(widget);
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<DashboardWidgetResponse>> UpdateAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (!await CollectionValidation.ExistsAsync(db, familyId, request.CollectionId, cancellationToken))
        {
            return Result<DashboardWidgetResponse>.Failure(InvalidCollectionError);
        }

        var found = await FindMutableWidgetAsync(familyId, userId, isAdmin, id, cancellationToken);
        if (!found.IsSuccess) return Result<DashboardWidgetResponse>.Failure(found.Error!);
        var widget = found.Value!;

        widget.ShowPanel = request.ShowPanel;
        widget.Config = ToConfigJson(request.TileOrder, request.TileKey, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly);
        widget.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<DashboardWidgetResponse>> UpdateSpanAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, UpdateDashboardWidgetSpanRequest request, CancellationToken cancellationToken)
    {
        if (request.Span is < 1 || request.Span > ColumnCount)
        {
            return Result<DashboardWidgetResponse>.Failure(Error.BadRequest(
                "Invalid span", $"Span must be between 1 and {ColumnCount}."));
        }

        var found = await FindMutableWidgetAsync(familyId, userId, isAdmin, id, cancellationToken);
        if (!found.IsSuccess) return Result<DashboardWidgetResponse>.Failure(found.Error!);
        var widget = found.Value!;

        widget.Span = request.Span;
        widget.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<IReadOnlyList<DashboardWidgetResponse>>> ReorderAsync(Guid familyId, Guid userId, DashboardWidgetScope scope, bool isAdmin, ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken)
    {
        if (scope == DashboardWidgetScope.Family && !isAdmin)
        {
            return Result<IReadOnlyList<DashboardWidgetResponse>>.Failure(AdminOnlyError);
        }

        var widgets = await ScopedQuery(familyId, userId, (DomainWidgetScope)scope).ToListAsync(cancellationToken);

        var widgetsById = widgets.ToDictionary(w => w.Id);
        if (request.OrderedWidgetIds.Count != widgets.Count || request.OrderedWidgetIds.Any(id => !widgetsById.ContainsKey(id)))
        {
            return Result<IReadOnlyList<DashboardWidgetResponse>>.Failure(Error.BadRequest(
                "Invalid widget order", "OrderedWidgetIds must be exactly this dashboard's current widget ids, each once."));
        }

        for (var i = 0; i < request.OrderedWidgetIds.Count; i++)
        {
            var widget = widgetsById[request.OrderedWidgetIds[i]];
            widget.SortOrder = i;
            widget.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        IReadOnlyList<DashboardWidgetResponse> ordered = widgets.OrderBy(w => w.SortOrder).Select(ToResponse).ToList();
        return Result<IReadOnlyList<DashboardWidgetResponse>>.Success(ordered);
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, CancellationToken cancellationToken)
    {
        var found = await FindMutableWidgetAsync(familyId, userId, isAdmin, id, cancellationToken);
        if (!found.IsSuccess) return Result.Failure(found.Error!);

        db.DashboardWidgets.Remove(found.Value!);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    /// <summary>Every widget belonging to one dashboard: Personal is also filtered by UserId, Family is shared by everyone in the Family.</summary>
    private IQueryable<Domain.Entities.DashboardWidget> ScopedQuery(Guid familyId, Guid userId, DomainWidgetScope scope)
    {
        var query = db.DashboardWidgets.Where(w => w.FamilyId == familyId && w.Scope == scope);
        return scope == DomainWidgetScope.Personal ? query.Where(w => w.UserId == userId) : query;
    }

    /// <summary>
    /// Looks up a single widget for a mutation, distinguishing "doesn't exist / isn't yours" (404, same as
    /// today's behavior for a foreign Personal widget) from "exists, but you're not an admin" (403) for Family widgets.
    /// </summary>
    private async Task<Result<Domain.Entities.DashboardWidget>> FindMutableWidgetAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, CancellationToken cancellationToken)
    {
        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(w => w.Id == id && w.FamilyId == familyId, cancellationToken);
        if (widget is null) return Result<Domain.Entities.DashboardWidget>.Failure(Error.NotFound());

        if (widget.Scope == DomainWidgetScope.Personal && widget.UserId != userId)
        {
            return Result<Domain.Entities.DashboardWidget>.Failure(Error.NotFound());
        }

        if (widget.Scope == DomainWidgetScope.Family && !isAdmin)
        {
            return Result<Domain.Entities.DashboardWidget>.Failure(AdminOnlyError);
        }

        return Result<Domain.Entities.DashboardWidget>.Success(widget);
    }

    private static Error InvalidCollectionError => Error.BadRequest(
        "Invalid collection", "CollectionId doesn't belong to this Family.");

    private static Error AdminOnlyError => Error.Forbidden(
        "Admin only", "Only the family's Owner or Adult members can manage the Family dashboard.");

    private static string? ToConfigJson(IReadOnlyList<string>? tileOrder, string? tileKey, bool? importantOnly, Guid? collectionId, bool? assignedToMeOnly)
    {
        if (tileOrder is null && tileKey is null && importantOnly is null && collectionId is null && assignedToMeOnly is null) return null;
        return JsonSerializer.Serialize(new WidgetConfig(tileOrder, tileKey, importantOnly, collectionId, assignedToMeOnly));
    }

    private static DashboardWidgetResponse ToResponse(Domain.Entities.DashboardWidget widget)
    {
        var config = widget.Config is null ? null : JsonSerializer.Deserialize<WidgetConfig>(widget.Config);
        return new DashboardWidgetResponse(
            widget.Id, (DashboardWidgetType)widget.Type, (DashboardWidgetScope)widget.Scope, widget.SortOrder, widget.Span, widget.ShowPanel,
            config?.TileOrder, config?.TileKey, config?.ImportantOnly, config?.CollectionId, config?.AssignedToMeOnly);
    }

    private record WidgetConfig(IReadOnlyList<string>? TileOrder, string? TileKey, bool? ImportantOnly, Guid? CollectionId, bool? AssignedToMeOnly);
}
