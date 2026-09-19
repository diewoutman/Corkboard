using Corkboard.Domain.Entities;
using Ical.Net;
using Ical.Net.CalendarComponents;
using Ical.Net.DataTypes;
using Ical.Net.Serialization;

namespace Corkboard.Infrastructure.Ics;

/// <summary>
/// Serializes a Calendar Collection's Appointments to a standard .ics document
/// (RFC 5545) — one VEVENT per Appointment, plus one extra VEVENT per
/// AppointmentException override (same UID + a RECURRENCE-ID, the standard way
/// to represent "this one occurrence was moved/renamed"), and an EXDATE per
/// skipped occurrence. Lets any calendar app do its own RRULE expansion rather
/// than us pre-expanding occurrences into the feed.
/// </summary>
public class IcsExportService
{
    public string Serialize(Collection calendar, IReadOnlyList<Appointment> appointments)
    {
        var ical = new Ical.Net.Calendar();

        foreach (var appointment in appointments)
        {
            if (appointment.From is not { } from) continue;

            var masterEvent = BuildEvent(appointment.Id, appointment.Title, appointment.Description,
                appointment.Location, from, appointment.Until, appointment.AllDay);

            if (!string.IsNullOrWhiteSpace(appointment.RecurrenceRule))
            {
                masterEvent.RecurrenceRule = new RecurrenceRule(appointment.RecurrenceRule);

                foreach (var skipped in appointment.Exceptions.Where(e => e.IsSkipped))
                {
                    masterEvent.ExceptionDates.Add(ToCalDateTime(skipped.OriginalOccurrenceDate, from, appointment.AllDay));
                }
            }

            ical.Events.Add(masterEvent);

            foreach (var overridden in appointment.Exceptions.Where(e => !e.IsSkipped))
            {
                var overrideEvent = BuildEvent(
                    appointment.Id,
                    overridden.OverrideTitle ?? appointment.Title,
                    appointment.Description,
                    overridden.OverrideLocation ?? appointment.Location,
                    overridden.OverrideFrom ?? from,
                    overridden.OverrideUntil,
                    appointment.AllDay);
                overrideEvent.RecurrenceIdentifier = new RecurrenceIdentifier(
                    ToCalDateTime(overridden.OriginalOccurrenceDate, from, appointment.AllDay), RecurrenceRange.ThisInstance);
                ical.Events.Add(overrideEvent);
            }
        }

        return new CalendarSerializer(ical).SerializeToString() ?? string.Empty;
    }

    private static CalendarEvent BuildEvent(
        Guid appointmentId, string title, string? description, string? location,
        DateTimeOffset from, DateTimeOffset? until, bool allDay)
    {
        return new CalendarEvent
        {
            Uid = appointmentId.ToString(),
            Summary = title,
            Description = description,
            Location = location,
            Start = allDay ? new CalDateTime(DateOnly.FromDateTime(from.UtcDateTime)) : new CalDateTime(from.UtcDateTime, "UTC"),
            End = until is { } u ? (allDay ? new CalDateTime(DateOnly.FromDateTime(u.UtcDateTime)) : new CalDateTime(u.UtcDateTime, "UTC")) : null,
        };
    }

    /// <summary>
    /// EXDATE/RECURRENCE-ID must exactly match the original occurrence's DTSTART
    /// (RFC 5545) — same date AND time — or calendar apps won't match it up
    /// against the RRULE expansion. Combines the exception's date with the
    /// master event's own time-of-day, not midnight.
    /// </summary>
    private static CalDateTime ToCalDateTime(DateOnly date, DateTimeOffset masterFrom, bool allDay) =>
        allDay
            ? new CalDateTime(date)
            : new CalDateTime(date.ToDateTime(TimeOnly.FromDateTime(masterFrom.UtcDateTime)), "UTC");
}
