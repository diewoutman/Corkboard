namespace Corkboard.Domain.Entities;

/// <summary>
/// What a Collection means to the user — Collection itself is a backend-only
/// grouping concept (like Node), never surfaced by name. "A Task list is a
/// Collection of Task Nodes"; "a Calendar is a Collection of Appointment Nodes".
/// Schedule is also a Collection of Appointment Nodes — same shape as Calendar,
/// just filled in through a dedicated weekly (day-of-week × time) editor instead
/// of one-off dated events, and rendered as just another togglable layer in the
/// calendar grid (see CalendarPage) rather than a separate view.
/// </summary>
public enum CollectionType
{
    TaskList,
    Calendar,
    Schedule,
}
