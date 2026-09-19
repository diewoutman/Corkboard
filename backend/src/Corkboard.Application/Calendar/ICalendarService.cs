using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;

namespace Corkboard.Application.Calendar;

public interface ICalendarService
{
    /// <summary>
    /// Expands every Appointment overlapping [from, until] — recurring ones included
    /// — into concrete occurrences, across all the family's calendars unless
    /// calendarId narrows it to one. This is what the calendar grid renders.
    /// </summary>
    Task<IReadOnlyList<OccurrenceResponse>> GetOccurrencesAsync(Guid familyId, DateTimeOffset from, DateTimeOffset until, Guid? calendarId, CancellationToken cancellationToken);

    /// <summary>Skips or overrides one occurrence of a recurring Appointment.</summary>
    Task<Result> SetOccurrenceExceptionAsync(Guid familyId, Guid appointmentId, DateOnly date, SetOccurrenceExceptionRequest request, CancellationToken cancellationToken);

    /// <summary>Imports events parsed from an .ics document as Appointments in the given calendar Collection.</summary>
    Task<Result<ImportIcsResult>> ImportAsync(Guid familyId, Guid userId, Guid collectionId, string icsText, CancellationToken cancellationToken);
}
