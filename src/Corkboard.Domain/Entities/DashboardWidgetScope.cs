namespace Corkboard.Domain.Entities;

/// <summary>
/// Which of a Family's two Home dashboards a DashboardWidget belongs to. See
/// DashboardWidget's doc comment for how each scope is queried/authorized.
/// </summary>
public enum DashboardWidgetScope
{
    /// <summary>Per-User layout — today's existing behavior.</summary>
    Personal,

    /// <summary>One shared layout per Family, editable only by Owner/Adult roles.</summary>
    Family,
}
