namespace Corkboard.Domain.Entities;

public enum DashboardWidgetType
{
    /// <summary>The tile grid to the other pages (Tasks, Notes, Calendar, ...).</summary>
    Navigation,
    Notes,
    Tasks,

    /// <summary>Today's due Tasks and Calendar occurrences, grouped by FamilyMember. No per-widget config.</summary>
    Today,

    /// <summary>The next 7 days' Tasks and Calendar occurrences, grouped by day. No per-widget config.</summary>
    Upcoming,

    /// <summary>Today's due Tasks and Calendar occurrences, grouped into daypart segments (night/morning/afternoon/evening). No per-widget config.</summary>
    Timeline,

    /// <summary>A single navigation tile (see Navigation), standalone instead of grouped in a tile grid.</summary>
    Shortcut,
}
