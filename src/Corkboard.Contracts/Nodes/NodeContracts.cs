namespace Corkboard.Contracts.Nodes;

/// <summary>
/// One shape for all three node types — fields that don't apply to the given
/// Type (e.g. Location on a Note) are ignored server-side rather than rejected,
/// keeping the client's create/edit form simple to reuse across types.
/// </summary>
public record CreateNodeRequest(
    NodeType Type,
    string Title,
    string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    /// <summary>e.g. the Task list this Task should land in. Null for an ungrouped Node.</summary>
    Guid? CollectionId,
    // Task-only
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule);

/// <summary>Type is immutable after creation — not included here.</summary>
public record UpdateNodeRequest(
    string Title,
    string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    Guid? CollectionId,
    // Task-only
    bool? IsCompleted,
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule);

public record NodeResponse(
    Guid Id,
    NodeType Type,
    string Title,
    string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    Guid CreatedByUserId,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    Guid? CollectionId,
    // Task-only
    bool? IsCompleted,
    DateTimeOffset? CompletedAt,
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule);
