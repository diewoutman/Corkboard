using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.Nodes;

public record ContactPhoneNumberDto([Required, StringLength(50, MinimumLength = 1)] string Number, [StringLength(50)] string? Label);

public record ContactEmailDto([Required, EmailAddress, StringLength(256)] string Email, [StringLength(50)] string? Label);

/// <summary>
/// One shape for all four node types — fields that don't apply to the given
/// Type (e.g. Location on a Note) are ignored server-side rather than rejected,
/// keeping the client's create/edit form simple to reuse across types. Only
/// Title is unconditionally required; other free-text fields are capped in
/// length (rather than required) since they're only meaningful for some Types.
/// </summary>
public record CreateNodeRequest(
    NodeType Type,
    [Required, StringLength(500, MinimumLength = 1)] string Title,
    [StringLength(10_000)] string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    /// <summary>e.g. the Task list this Task should land in, or the Household this Contact belongs to. Null for an ungrouped Node.</summary>
    Guid? CollectionId,
    // Note-only
    bool? IsImportant,
    // Task-only
    int? Priority,
    /// <summary>The Section (Todoist-style category) within the Task's Collection, if any.</summary>
    Guid? SectionId,
    // Appointment-only
    [StringLength(500)] string? Location,
    bool? AllDay,
    [StringLength(2000)] string? RecurrenceRule,
    // Contact-only — FirstName/LastName required, at least one phone number required
    [StringLength(200)] string? FirstName,
    [StringLength(200)] string? LastName,
    DateOnly? DateOfBirth,
    [StringLength(200)] string? Street,
    [StringLength(100)] string? City,
    [StringLength(20)] string? PostalCode,
    [StringLength(100)] string? Country,
    IReadOnlyList<ContactPhoneNumberDto>? PhoneNumbers,
    IReadOnlyList<ContactEmailDto>? Emails);

/// <summary>Type is immutable after creation — not included here.</summary>
public record UpdateNodeRequest(
    [Required, StringLength(500, MinimumLength = 1)] string Title,
    [StringLength(10_000)] string? Description,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    IReadOnlyList<Guid> AssignedFamilyMemberIds,
    Guid? CollectionId,
    // Note-only
    bool? IsImportant,
    // Task-only
    bool? IsCompleted,
    int? Priority,
    Guid? SectionId,
    // Appointment-only
    [StringLength(500)] string? Location,
    bool? AllDay,
    [StringLength(2000)] string? RecurrenceRule,
    // Contact-only
    [StringLength(200)] string? FirstName,
    [StringLength(200)] string? LastName,
    DateOnly? DateOfBirth,
    [StringLength(200)] string? Street,
    [StringLength(100)] string? City,
    [StringLength(20)] string? PostalCode,
    [StringLength(100)] string? Country,
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
    Guid? SectionId,
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
