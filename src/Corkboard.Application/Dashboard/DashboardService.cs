using System.Text.Json;
using Corkboard.Application.Collections;
using Corkboard.Application.Common;
using Corkboard.Contracts.Dashboard;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainWidgetType = Corkboard.Domain.Entities.DashboardWidgetType;

namespace Corkboard.Application.Dashboard;

public class DashboardService(CorkboardDbContext db) : IDashboardService
{
    /// <summary>Fixed number of columns the dashboard lays widgets out in — the client mirrors this.</summary>
    public const int ColumnCount = 3;

    public async Task<IReadOnlyList<DashboardWidgetResponse>> ListAsync(Guid familyId, Guid userId, CancellationToken cancellationToken)
    {
        var widgets = await db.DashboardWidgets.AsNoTracking()
            .Where(w => w.UserId == userId && w.FamilyId == familyId)
            .OrderBy(w => w.SortOrder)
            .ToListAsync(cancellationToken);

        if (widgets.Count == 0)
        {
            // First visit — seed the one widget every earlier version of this page always showed.
            var seeded = new Domain.Entities.DashboardWidget
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                FamilyId = familyId,
                Type = DomainWidgetType.Navigation,
                SortOrder = 0,
                Span = ColumnCount,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            db.DashboardWidgets.Add(seeded);
            await db.SaveChangesAsync(cancellationToken);
            widgets = [seeded];
        }

        return widgets.Select(ToResponse).ToList();
    }

    public async Task<Result<DashboardWidgetResponse>> CreateAsync(Guid familyId, Guid userId, CreateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (!await CollectionValidation.ExistsAsync(db, familyId, request.CollectionId, cancellationToken))
        {
            return Result<DashboardWidgetResponse>.Failure(InvalidCollectionError);
        }

        var nextSortOrder = 1 + await db.DashboardWidgets
            .Where(w => w.UserId == userId && w.FamilyId == familyId)
            .Select(w => (int?)w.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var now = DateTimeOffset.UtcNow;
        var widget = new Domain.Entities.DashboardWidget
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            FamilyId = familyId,
            Type = (DomainWidgetType)request.Type,
            SortOrder = nextSortOrder,
            Span = 1,
            Config = ToConfigJson(request.TileOrder, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.DashboardWidgets.Add(widget);
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<DashboardWidgetResponse>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (!await CollectionValidation.ExistsAsync(db, familyId, request.CollectionId, cancellationToken))
        {
            return Result<DashboardWidgetResponse>.Failure(InvalidCollectionError);
        }

        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(
            w => w.UserId == userId && w.FamilyId == familyId && w.Id == id, cancellationToken);
        if (widget is null) return Result<DashboardWidgetResponse>.Failure(Error.NotFound());

        widget.Config = ToConfigJson(request.TileOrder, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly);
        widget.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<DashboardWidgetResponse>> UpdateSpanAsync(Guid familyId, Guid userId, Guid id, UpdateDashboardWidgetSpanRequest request, CancellationToken cancellationToken)
    {
        if (request.Span is < 1 || request.Span > ColumnCount)
        {
            return Result<DashboardWidgetResponse>.Failure(Error.BadRequest(
                "Invalid span", $"Span must be between 1 and {ColumnCount}."));
        }

        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(
            w => w.UserId == userId && w.FamilyId == familyId && w.Id == id, cancellationToken);
        if (widget is null) return Result<DashboardWidgetResponse>.Failure(Error.NotFound());

        widget.Span = request.Span;
        widget.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Result<DashboardWidgetResponse>.Success(ToResponse(widget));
    }

    public async Task<Result<IReadOnlyList<DashboardWidgetResponse>>> ReorderAsync(Guid familyId, Guid userId, ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken)
    {
        var widgets = await db.DashboardWidgets
            .Where(w => w.UserId == userId && w.FamilyId == familyId)
            .ToListAsync(cancellationToken);

        var widgetsById = widgets.ToDictionary(w => w.Id);
        if (request.OrderedWidgetIds.Count != widgets.Count || request.OrderedWidgetIds.Any(id => !widgetsById.ContainsKey(id)))
        {
            return Result<IReadOnlyList<DashboardWidgetResponse>>.Failure(Error.BadRequest(
                "Invalid widget order", "OrderedWidgetIds must be exactly the caller's current widget ids, each once."));
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

    public async Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(
            w => w.UserId == userId && w.FamilyId == familyId && w.Id == id, cancellationToken);
        if (widget is null) return Result.Failure(Error.NotFound());

        db.DashboardWidgets.Remove(widget);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static Error InvalidCollectionError => Error.BadRequest(
        "Invalid collection", "CollectionId doesn't belong to this Family.");

    private static string? ToConfigJson(IReadOnlyList<string>? tileOrder, bool? importantOnly, Guid? collectionId, bool? assignedToMeOnly)
    {
        if (tileOrder is null && importantOnly is null && collectionId is null && assignedToMeOnly is null) return null;
        return JsonSerializer.Serialize(new WidgetConfig(tileOrder, importantOnly, collectionId, assignedToMeOnly));
    }

    private static DashboardWidgetResponse ToResponse(Domain.Entities.DashboardWidget widget)
    {
        var config = widget.Config is null ? null : JsonSerializer.Deserialize<WidgetConfig>(widget.Config);
        return new DashboardWidgetResponse(
            widget.Id, (DashboardWidgetType)widget.Type, widget.SortOrder, widget.Span,
            config?.TileOrder, config?.ImportantOnly, config?.CollectionId, config?.AssignedToMeOnly);
    }

    private record WidgetConfig(IReadOnlyList<string>? TileOrder, bool? ImportantOnly, Guid? CollectionId, bool? AssignedToMeOnly);
}
