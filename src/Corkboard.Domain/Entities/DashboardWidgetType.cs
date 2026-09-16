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
}
