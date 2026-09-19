namespace Corkboard.Infrastructure.Recurrence;

/// <summary>One expanded instance of a (possibly recurring) Appointment.</summary>
public record AppointmentOccurrence(
    DateOnly OriginalDate,
    DateTimeOffset From,
    DateTimeOffset? Until,
    string Title,
    string? Location,
    bool IsException);
