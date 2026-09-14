namespace Corkboard.Contracts.Nodes;

public record ContactPhoneNumberDto(string Number, string? Label);

public record ContactEmailDto(string Email, string? Label);

/// <summary>
/// One shape for all four node types — fields that don't apply to the given
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
    /// <summary>e.g. the Task list this Task should land in, or the Household this Contact belongs to. Null for an ungrouped Node.</summary>
    Guid? CollectionId,
    // Note-only
    bool? IsImportant,
    // Task-only
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule,
    // Contact-only — FirstName/LastName required, at least one phone number required
    string? FirstName,
    string? LastName,
    DateOnly? DateOfBirth,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country,
    IReadOnlyList<ContactPhoneNumberDto>? PhoneNumbers,
    IReadOnlyList<ContactEmailDto>? Emails);

/// <summary>Type is immutable after creation — not included here.</summary>
public record UpdateNodeRequest(
    string Title,
    string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    Guid? CollectionId,
    // Note-only
    bool? IsImportant,
    // Task-only
    bool? IsCompleted,
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule,
    // Contact-only
    string? FirstName,
    string? LastName,
    DateOnly? DateOfBirth,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country,
    IReadOnlyList<ContactPhoneNumberDto>? PhoneNumbers,
    IReadOnlyList<ContactEmailDto>? Emails);

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
    // Note-only
    bool? IsImportant,
    // Task-only
    bool? IsCompleted,
    DateTimeOffset? CompletedAt,
    int? Priority,
    // Appointment-only
    string? Location,
    bool? AllDay,
    string? RecurrenceRule,
    // Contact-only
    string? FirstName,
    string? LastName,
    DateOnly? DateOfBirth,
    string? Street,
    string? City,
    string? PostalCode,
    string? Country,
    IReadOnlyList<ContactPhoneNumberDto> PhoneNumbers,
    IReadOnlyList<ContactEmailDto> Emails);
