namespace Corkboard.Contracts.Dashboard;

/// <summary>Mirrors Corkboard.Domain.Entities.DashboardWidgetType — kept in sync by hand.</summary>
public enum DashboardWidgetType
{
    Navigation,
    Notes,
    Tasks,
    Today,
    Upcoming,
    Shortcut,
}

/// <summary>Mirrors Corkboard.Domain.Entities.DashboardWidgetScope — kept in sync by hand.</summary>
public enum DashboardWidgetScope
{
    Personal,
    Family,
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
    DashboardWidgetScope Scope,
    // Applies to every type — whether the widget renders inside the card chrome or bare on the board.
    bool ShowPanel,
    // Navigation-only — which tiles to show, and in what order. Null/omitted means "all, default order".
    IReadOnlyList<string>? TileOrder,
    // Shortcut-only — which single tile (see TILE_DEFS on the client) this button points to.
    string? TileKey,
    // Notes-only
    bool? ImportantOnly,
    // Tasks-only — a specific list, or all Tasks assigned to the caller when both are unset
    Guid? CollectionId,
    bool? AssignedToMeOnly);

public record UpdateDashboardWidgetRequest(
    bool ShowPanel,
    IReadOnlyList<string>? TileOrder,
    string? TileKey,
    bool? ImportantOnly,
    Guid? CollectionId,
    bool? AssignedToMeOnly);

/// <summary>Full replacement of the caller's widget order — SortOrder becomes each id's index in this list.</summary>
public record ReorderDashboardWidgetsRequest(IReadOnlyList<Guid> OrderedWidgetIds);

/// <summary>How many grid columns (1-DashboardService.ColumnCount) a widget's card should span.</summary>
public record UpdateDashboardWidgetSpanRequest(int Span);

public record DashboardWidgetResponse(
    Guid Id,
    DashboardWidgetType Type,
    DashboardWidgetScope Scope,
    int SortOrder,
    int Span,
    bool ShowPanel,
    IReadOnlyList<string>? TileOrder,
    string? TileKey,
    bool? ImportantOnly,
    Guid? CollectionId,
    bool? AssignedToMeOnly);
