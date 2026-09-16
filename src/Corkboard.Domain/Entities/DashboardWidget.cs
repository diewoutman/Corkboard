namespace Corkboard.Domain.Entities;

/// <summary>
/// One element on a Home dashboard. Scoped to a Family (FamilyId), so
/// per-widget settings that reference family data (e.g. a Task widget's
/// CollectionId) stay meaningful if a User is ever in more than one Family
/// (see UserFamily's own doc comment on that).
///
/// Two dashboards share this one entity, discriminated by Scope: Personal is
/// per-User (not per-FamilyMember — not every FamilyMember can log in) and
/// UserId-filtered everywhere; Family is one shared layout per Family, UserId
/// is only "who created this widget" and plays no part in querying/ownership,
/// and mutating it requires an Owner/Adult role (enforced in
/// DashboardController, not here).
/// </summary>
public class DashboardWidget
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public DashboardWidgetType Type { get; set; }

    public DashboardWidgetScope Scope { get; set; } = DashboardWidgetScope.Personal;

    /// <summary>Ascending draw order — what the user reordered via drag-and-drop.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// How many of the dashboard's fixed columns (see DashboardService.ColumnCount) this
    /// widget's card spans, 1-ColumnCount. The grid auto-flows widgets in SortOrder, wrapping to
    /// a new row whenever a widget doesn't fit the remaining width — there's no separate row/column
    /// coordinate to maintain.
    /// </summary>
    public int Span { get; set; } = 1;

    /// <summary>
    /// Per-widget-type settings as JSON (jsonb column) — deliberately not
    /// columns on this entity: the shapes are heterogeneous (Navigation's is a
    /// tile-key array, Notes' and Tasks' are scalars) and there's no need to
    /// ever query into it relationally, unlike e.g. Node's TPH fields. DashboardService
    /// still exposes/accepts a flat typed shape — see DashboardWidgetResponse —
    /// so nothing outside that service deals with raw JSON.
    /// </summary>
    public string? Config { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
