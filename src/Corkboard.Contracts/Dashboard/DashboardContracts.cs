namespace Corkboard.Contracts.Dashboard;

/// <summary>Mirrors Corkboard.Domain.Entities.DashboardWidgetType — kept in sync by hand.</summary>
public enum DashboardWidgetType
{
    Navigation,
    Notes,
    Tasks,
    Today,
}

/// <summary>
/// One flat shape covering every widget type's settings, same convention as
/// CreateNodeRequest — fields that don't apply to the given Type are ignored
/// server-side. New widgets are appended at the end, one column wide;
/// repositioning is a separate call (see ReorderDashboardWidgetsRequest), and
/// resizing another (see UpdateDashboardWidgetSpanRequest).
/// </summary>
public record CreateDashboardWidgetRequest(
    DashboardWidgetType Type,
    // Navigation-only — which tiles to show, and in what order. Null/omitted means "all, default order".
    IReadOnlyList<string>? TileOrder,
    // Notes-only
    bool? ImportantOnly,
    // Tasks-only — a specific list, or all Tasks assigned to the caller when both are unset
    Guid? CollectionId,
    bool? AssignedToMeOnly);

public record UpdateDashboardWidgetRequest(
    IReadOnlyList<string>? TileOrder,
    bool? ImportantOnly,
    Guid? CollectionId,
    bool? AssignedToMeOnly);

/// <summary>Full replacement of the caller's widget order — SortOrder becomes each id's index in this list.</summary>
public record ReorderDashboardWidgetsRequest(IReadOnlyList<Guid> OrderedWidgetIds);

/// <summary>How many grid columns (1-DashboardController.ColumnCount) a widget's card should span.</summary>
public record UpdateDashboardWidgetSpanRequest(int Span);

public record DashboardWidgetResponse(
    Guid Id,
    DashboardWidgetType Type,
    int SortOrder,
    int Span,
    IReadOnlyList<string>? TileOrder,
    bool? ImportantOnly,
    Guid? CollectionId,
    bool? AssignedToMeOnly);
