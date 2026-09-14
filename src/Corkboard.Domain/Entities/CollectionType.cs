namespace Corkboard.Domain.Entities;

/// <summary>
/// What a Collection means to the user — Collection itself is a backend-only
/// grouping concept (like Node), never surfaced by name. TaskList is the only
/// user-facing kind so far ("a Task list is a Collection of Task Nodes"); more
/// kinds (e.g. a Note folder, a Calendar) can be added without a schema change.
/// </summary>
public enum CollectionType
{
    TaskList,
}
