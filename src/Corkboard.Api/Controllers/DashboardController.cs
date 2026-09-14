using System.Text.Json;
using Corkboard.Api.Common;
using Corkboard.Contracts.Dashboard;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DomainWidgetType = Corkboard.Domain.Entities.DashboardWidgetType;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
public class DashboardController(CorkboardDbContext db) : FamilyScopedControllerBase
{
    /// <summary>Widgets belong to this caller specifically, not the whole Family — every other endpoint here is scoped the same way.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DashboardWidgetResponse>>> List(CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var widgets = await db.DashboardWidgets.AsNoTracking()
            .Where(w => w.UserId == CurrentUserId && w.FamilyId == familyId)
            .OrderBy(w => w.SortOrder)
            .ToListAsync(cancellationToken);

        if (widgets.Count == 0)
        {
            // First visit — seed the one widget every earlier version of this page always showed.
            var seeded = new Domain.Entities.DashboardWidget
            {
                Id = Guid.NewGuid(),
                UserId = CurrentUserId,
                FamilyId = familyId,
                Type = DomainWidgetType.Navigation,
                SortOrder = 0,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };
            db.DashboardWidgets.Add(seeded);
            await db.SaveChangesAsync(cancellationToken);
            widgets = [seeded];
        }

        return Ok(widgets.Select(ToResponse).ToList());
    }

    [HttpPost]
    public async Task<ActionResult<DashboardWidgetResponse>> Create(CreateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        if (!await IsValidCollectionId(familyId, request.CollectionId, cancellationToken)) return InvalidCollectionProblem();

        var nextSortOrder = 1 + await db.DashboardWidgets
            .Where(w => w.UserId == CurrentUserId && w.FamilyId == familyId)
            .Select(w => (int?)w.SortOrder)
            .MaxAsync(cancellationToken) ?? 0;

        var now = DateTimeOffset.UtcNow;
        var widget = new Domain.Entities.DashboardWidget
        {
            Id = Guid.NewGuid(),
            UserId = CurrentUserId,
            FamilyId = familyId,
            Type = (DomainWidgetType)request.Type,
            SortOrder = nextSortOrder,
            Config = ToConfigJson(request.TileOrder, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly),
            CreatedAt = now,
            UpdatedAt = now,
        };

        db.DashboardWidgets.Add(widget);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(List), ToResponse(widget));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DashboardWidgetResponse>> Update(Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        if (!await IsValidCollectionId(familyId, request.CollectionId, cancellationToken)) return InvalidCollectionProblem();

        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(
            w => w.UserId == CurrentUserId && w.FamilyId == familyId && w.Id == id, cancellationToken);
        if (widget is null) return NotFound();

        widget.Config = ToConfigJson(request.TileOrder, request.ImportantOnly, request.CollectionId, request.AssignedToMeOnly);
        widget.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(widget));
    }

    /// <summary>Drag-and-drop reordering — the caller sends its whole new order, SortOrder becomes each id's index.</summary>
    [HttpPut("reorder")]
    public async Task<ActionResult<IReadOnlyList<DashboardWidgetResponse>>> Reorder(ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var widgets = await db.DashboardWidgets
            .Where(w => w.UserId == CurrentUserId && w.FamilyId == familyId)
            .ToListAsync(cancellationToken);

        var widgetsById = widgets.ToDictionary(w => w.Id);
        if (request.OrderedWidgetIds.Count != widgets.Count || request.OrderedWidgetIds.Any(id => !widgetsById.ContainsKey(id)))
        {
            return Problem(
                title: "Invalid widget order",
                detail: "OrderedWidgetIds must be exactly the caller's current widget ids, each once.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        for (var i = 0; i < request.OrderedWidgetIds.Count; i++)
        {
            var widget = widgetsById[request.OrderedWidgetIds[i]];
            widget.SortOrder = i;
            widget.UpdatedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Ok(widgets.OrderBy(w => w.SortOrder).Select(ToResponse).ToList());
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var widget = await db.DashboardWidgets.FirstOrDefaultAsync(
            w => w.UserId == CurrentUserId && w.FamilyId == familyId && w.Id == id, cancellationToken);
        if (widget is null) return NotFound();

        db.DashboardWidgets.Remove(widget);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private async Task<bool> IsValidCollectionId(Guid familyId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (collectionId is not { } id) return true;
        return await db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
    }

    private ObjectResult InvalidCollectionProblem() => Problem(
        title: "Invalid collection",
        detail: "CollectionId doesn't belong to this Family.",
        statusCode: StatusCodes.Status400BadRequest);

    private static string? ToConfigJson(IReadOnlyList<string>? tileOrder, bool? importantOnly, Guid? collectionId, bool? assignedToMeOnly)
    {
        if (tileOrder is null && importantOnly is null && collectionId is null && assignedToMeOnly is null) return null;
        return JsonSerializer.Serialize(new WidgetConfig(tileOrder, importantOnly, collectionId, assignedToMeOnly));
    }

    private static DashboardWidgetResponse ToResponse(Domain.Entities.DashboardWidget widget)
    {
        var config = widget.Config is null ? null : JsonSerializer.Deserialize<WidgetConfig>(widget.Config);
        return new DashboardWidgetResponse(
            widget.Id, (DashboardWidgetType)widget.Type, widget.SortOrder,
            config?.TileOrder, config?.ImportantOnly, config?.CollectionId, config?.AssignedToMeOnly);
    }

    private record WidgetConfig(IReadOnlyList<string>? TileOrder, bool? ImportantOnly, Guid? CollectionId, bool? AssignedToMeOnly);
}
