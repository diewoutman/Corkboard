using Corkboard.Domain.Entities;
using Ical.Net.CalendarComponents;
using Ical.Net.DataTypes;

namespace Corkboard.Infrastructure.Recurrence;

/// <summary>
/// Expands a (possibly recurring) Appointment into concrete occurrences for a
/// date range — see CONCEPT.md §3.3: only the RecurrenceRule (an RFC 5545 RRULE
/// value, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR") is stored; no occurrence rows exist.
/// AppointmentExceptions override or skip individual occurrences by date.
///
/// Known simplification: an occurrence's "original date" (used to match against
/// AppointmentException.OriginalOccurrenceDate) is derived from its UTC start,
/// not the family's local time zone — an occurrence within a few hours of
/// midnight UTC could match the "wrong" calendar day for families far from UTC.
/// Good enough for now; revisit if it causes real confusion.
/// </summary>
public class RecurrenceExpansionService
{
    public IReadOnlyList<AppointmentOccurrence> Expand(Appointment appointment, DateTimeOffset rangeStart, DateTimeOffset rangeEnd)
    {
        if (appointment.From is not { } from) return [];

        if (string.IsNullOrWhiteSpace(appointment.RecurrenceRule))
        {
            var until = appointment.Until;
            var overlapsRange = (until ?? from) >= rangeStart && from <= rangeEnd;
            if (!overlapsRange) return [];

            return
            [
                new AppointmentOccurrence(
                    DateOnly.FromDateTime(from.UtcDateTime), from, until,
                    appointment.Title, appointment.Location, IsException: false),
            ];
        }

        var exceptionsByDate = appointment.Exceptions.ToDictionary(e => e.OriginalOccurrenceDate);
        var duration = appointment.Until is { } untilValue ? untilValue - from : (TimeSpan?)null;

        var calendarEvent = new CalendarEvent
        {
            Start = new CalDateTime(from.UtcDateTime, "UTC"),
            RecurrenceRule = new RecurrenceRule(appointment.RecurrenceRule),
        };

        var occurrences = new List<AppointmentOccurrence>();
        foreach (var occurrence in calendarEvent.GetOccurrences(new CalDateTime(rangeStart.UtcDateTime, "UTC")))
        {
            var occurrenceStart = new DateTimeOffset(occurrence.Period.StartTime.AsUtc, TimeSpan.Zero);
            if (occurrenceStart > rangeEnd) break;

            var originalDate = DateOnly.FromDateTime(occurrenceStart.UtcDateTime);
            var occurrenceEnd = duration is { } d ? occurrenceStart + d : (DateTimeOffset?)null;

            if (exceptionsByDate.TryGetValue(originalDate, out var exception))
            {
                if (exception.IsSkipped) continue;

                occurrences.Add(new AppointmentOccurrence(
                    originalDate,
                    exception.OverrideFrom ?? occurrenceStart,
                    exception.OverrideUntil ?? occurrenceEnd,
                    exception.OverrideTitle ?? appointment.Title,
                    exception.OverrideLocation ?? appointment.Location,
                    IsException: true));
                continue;
            }

            occurrences.Add(new AppointmentOccurrence(
                originalDate, occurrenceStart, occurrenceEnd,
                appointment.Title, appointment.Location, IsException: false));
        }

        return occurrences;
    }

    /// <summary>
    /// The next occurrence strictly after <paramref name="current"/> for a recurring
    /// Task's RecurrenceRule — used to roll a completed recurring Task's due date
    /// forward instead of storing occurrence rows the way Appointment does.
    /// Null once the rule has no more occurrences (e.g. a COUNT/UNTIL-bounded rule).
    /// </summary>
    public DateTimeOffset? NextOccurrenceAfter(DateTimeOffset current, string recurrenceRule)
    {
        var calendarEvent = new CalendarEvent
        {
            Start = new CalDateTime(current.UtcDateTime, "UTC"),
            RecurrenceRule = new RecurrenceRule(recurrenceRule),
        };

        var searchFrom = new CalDateTime(current.UtcDateTime.AddSeconds(1), "UTC");
        var next = calendarEvent.GetOccurrences(searchFrom).FirstOrDefault();
        return next is null ? null : new DateTimeOffset(next.Period.StartTime.AsUtc, TimeSpan.Zero);
    }
}
