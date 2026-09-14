namespace Corkboard.Domain.Entities;

/// <summary>
/// What a Collection means to the user — Collection itself is a backend-only
/// grouping concept (like Node), never surfaced by name. "A Task list is a
/// Collection of Task Nodes"; "a Calendar is a Collection of Appointment Nodes".
/// </summary>
public enum CollectionType
{
    TaskList,
    Calendar,
}
