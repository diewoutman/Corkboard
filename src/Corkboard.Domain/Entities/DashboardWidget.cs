namespace Corkboard.Domain.Entities;

/// <summary>
/// One element on a User's customizable Home dashboard. Per-User (not per-
/// FamilyMember — not every FamilyMember can log in) and scoped to a Family
/// too, so per-widget settings that reference family data (e.g. a Task
/// widget's CollectionId) stay meaningful if a User is ever in more than one
/// Family (see UserFamily's own doc comment on that).
/// </summary>
public class DashboardWidget
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public DashboardWidgetType Type { get; set; }

    /// <summary>Ascending draw order — what the user reordered via drag-and-drop.</summary>
    public int SortOrder { get; set; }

    /// <summary>
    /// Per-widget-type settings as JSON (jsonb column) — deliberately not
    /// columns on this entity: the shapes are heterogeneous (Navigation's is a
    /// tile-key array, Notes' and Tasks' are scalars) and there's no need to
    /// ever query into it relationally, unlike e.g. Node's TPH fields. The API
    /// layer (DashboardController) still exposes/accepts a flat typed shape —
    /// see DashboardWidgetResponse — so nothing outside that controller deals
    /// with raw JSON.
    /// </summary>
    public string? Config { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
