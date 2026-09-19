using Ical.Net.Serialization.DataTypes;

namespace Corkboard.Infrastructure.Ics;

/// <summary>
/// Parses an uploaded .ics document into Appointments to create. Only imports
/// "master" VEVENTs (no RECURRENCE-ID) — a recurring source event, or a plain
/// one-off. Per-occurrence override VEVENTs (RECURRENCE-ID set) in the source
/// file are skipped rather than mapped to AppointmentExceptions; a reasonable
/// v1 limitation given how rarely calendar exports actually contain them.
/// </summary>
public class IcsImportService
{
    public IReadOnlyList<ParsedIcsEvent> Parse(string icsText)
    {
        var calendar = Ical.Net.Calendar.Load(icsText);
        if (calendar is null) return [];

        var serializer = new RecurrenceRuleSerializer();
        var results = new List<ParsedIcsEvent>();

        foreach (var calendarEvent in calendar.Events)
        {
            if (calendarEvent.RecurrenceIdentifier is not null) continue;
            if (calendarEvent.Start is not { } start) continue;

            var from = new DateTimeOffset(start.AsUtc, TimeSpan.Zero);
            var until = calendarEvent.End is { } end ? new DateTimeOffset(end.AsUtc, TimeSpan.Zero) : (DateTimeOffset?)null;
            var recurrenceRule = calendarEvent.RecurrenceRule is { } rule
                ? serializer.SerializeToString(rule)
                : null;

            results.Add(new ParsedIcsEvent(
                calendarEvent.Summary ?? "(untitled)",
                calendarEvent.Description,
                calendarEvent.Location,
                from,
                until,
                !start.HasTime,
                recurrenceRule));
        }

        return results;
    }
}
