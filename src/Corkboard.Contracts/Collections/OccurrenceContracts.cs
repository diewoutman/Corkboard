namespace Corkboard.Contracts.Collections;

/// <summary>One expanded instance of a (possibly recurring) Appointment, for calendar-grid display.</summary>
public record OccurrenceResponse(
    Guid AppointmentId,
    Guid CollectionId,
    DateOnly OriginalDate,
    DateTimeOffset From,
    DateTimeOffset? Until,
    string Title,
    string? Location,
    bool AllDay,
    bool IsException,
    /// <summary>Whether the source Appointment repeats — the client uses this to decide between "delete this occurrence" and "delete the whole thing".</summary>
    bool IsRecurring,
    IReadOnlyList<Guid> AssignedFamilyMemberIds);

/// <summary>Skip (IsSkipped=true) or override a single occurrence of a recurring Appointment.</summary>
public record SetOccurrenceExceptionRequest(
    bool IsSkipped,
    string? OverrideTitle,
    string? OverrideLocation,
    DateTimeOffset? OverrideFrom,
    DateTimeOffset? OverrideUntil);

public record ImportIcsResult(int ImportedCount);
