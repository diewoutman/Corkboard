namespace Corkboard.Domain.Entities;

/// <summary>
/// A single-occurrence override or skip for a recurring Appointment, consulted
/// during on-read expansion of its RecurrenceRule.
/// </summary>
public class AppointmentException
{
    public Guid Id { get; set; }

    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;

    /// <summary>The date, per the rule's own un-overridden schedule, this exception applies to.</summary>
    public DateOnly OriginalOccurrenceDate { get; set; }

    public bool IsSkipped { get; set; }

    /// <summary>When not skipped, the replacement time/window for this occurrence.</summary>
    public DateTimeOffset? OverrideFrom { get; set; }
    public DateTimeOffset? OverrideUntil { get; set; }
    public string? OverrideTitle { get; set; }
    public string? OverrideLocation { get; set; }
}
