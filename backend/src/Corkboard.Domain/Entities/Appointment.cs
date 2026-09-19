namespace Corkboard.Domain.Entities;

public class Appointment : Node
{
    public string? Location { get; set; }
    public bool AllDay { get; set; }

    /// <summary>
    /// Pattern only (e.g. an RRULE-style string) — no occurrence rows are stored.
    /// The API expands this into concrete occurrences on read for a queried date
    /// range; see <see cref="AppointmentException"/> for per-occurrence overrides.
    /// </summary>
    public string? RecurrenceRule { get; set; }

    public List<AppointmentException> Exceptions { get; set; } = [];
}
