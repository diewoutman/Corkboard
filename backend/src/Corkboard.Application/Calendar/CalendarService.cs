using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Ics;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Calendar;

public class CalendarService(CorkboardDbContext db, RecurrenceExpansionService recurrence, IcsImportService icsImport) : ICalendarService
{
    public async Task<PagedResult<OccurrenceResponse>> GetOccurrencesAsync(Guid familyId, DateTimeOffset from, DateTimeOffset until, Guid? calendarId, PageRequest page, CancellationToken cancellationToken)
    {
        var query = db.Appointments
            .AsNoTracking()
            .Include(a => a.Assignments)
            .Include(a => a.Exceptions)
            .Where(a => a.FamilyId == familyId)
            .Where(a => a.Until != null ? a.Until >= from : a.From == null || a.From >= from)
            .Where(a => a.From == null || a.From <= until);

        if (calendarId is { } calendarIdValue)
        {
            query = query.Where(a => a.CollectionId == calendarIdValue);
        }

        var appointments = await query.ToListAsync(cancellationToken);

        return appointments
            .SelectMany(a => recurrence.Expand(a, from, until)
                .Select(o => new OccurrenceResponse(
                    a.Id,
                    a.CollectionId ?? Guid.Empty,
                    o.OriginalDate,
                    o.From,
                    o.Until,
                    o.Title,
                    o.Location,
                    a.AllDay,
                    o.IsException,
                    !string.IsNullOrWhiteSpace(a.RecurrenceRule),
                    a.Assignments.Select(x => x.FamilyMemberId).ToList())))
            .OrderBy(o => o.From).ThenBy(o => o.AppointmentId)
            .ToList()
            .ToPage(page); // recurrences are expanded in memory, so this one can only be cut after the fact
    }

    public async Task<Result> SetOccurrenceExceptionAsync(Guid familyId, Guid appointmentId, DateOnly date, SetOccurrenceExceptionRequest request, CancellationToken cancellationToken)
    {
        var appointment = await db.Appointments
            .Include(a => a.Exceptions)
            .FirstOrDefaultAsync(a => a.FamilyId == familyId && a.Id == appointmentId, cancellationToken);
        if (appointment is null) return Result.Failure(Error.NotFound());

        var exception = appointment.Exceptions.FirstOrDefault(e => e.OriginalOccurrenceDate == date);
        if (exception is null)
        {
            exception = new AppointmentException { Id = Guid.NewGuid(), AppointmentId = appointmentId, OriginalOccurrenceDate = date };
            db.Set<AppointmentException>().Add(exception);
        }

        exception.IsSkipped = request.IsSkipped;
        exception.OverrideTitle = request.OverrideTitle;
        exception.OverrideLocation = request.OverrideLocation;
        exception.OverrideFrom = request.OverrideFrom;
        exception.OverrideUntil = request.OverrideUntil;

        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    public async Task<Result<ImportIcsResult>> ImportAsync(Guid familyId, Guid userId, Guid collectionId, string icsText, CancellationToken cancellationToken)
    {
        var collectionExists = await db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == collectionId, cancellationToken);
        if (!collectionExists) return Result<ImportIcsResult>.Failure(Error.NotFound());

        var parsedEvents = icsImport.Parse(icsText);
        var now = DateTimeOffset.UtcNow;

        foreach (var parsed in parsedEvents)
        {
            db.Appointments.Add(new Appointment
            {
                Id = Guid.NewGuid(),
                FamilyId = familyId,
                CollectionId = collectionId,
                Title = parsed.Title,
                Description = parsed.Description,
                Location = parsed.Location,
                From = parsed.From,
                Until = parsed.Until,
                AllDay = parsed.AllDay,
                RecurrenceRule = parsed.RecurrenceRule,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = userId,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return Result<ImportIcsResult>.Success(new ImportIcsResult(parsedEvents.Count));
    }
}
