using Corkboard.Api.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Ics;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/calendar")]
public class CalendarController(CorkboardDbContext db, RecurrenceExpansionService recurrence, IcsImportService icsImport)
    : FamilyScopedControllerBase
{
    /// <summary>
    /// Expands every Appointment overlapping [from, until] — recurring ones included
    /// — into concrete occurrences, across all the family's calendars unless
    /// calendarId narrows it to one. This is what the calendar grid renders.
    /// </summary>
    [HttpGet("occurrences")]
    public async Task<ActionResult<IReadOnlyList<OccurrenceResponse>>> Occurrences(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset until,
        [FromQuery] Guid? calendarId,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var query = db.Appointments
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

        var occurrences = appointments
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
            .OrderBy(o => o.From)
            .ToList();

        return Ok(occurrences);
    }

    /// <summary>Skips or overrides one occurrence of a recurring Appointment.</summary>
    [HttpPut("appointments/{appointmentId:guid}/occurrences/{date}")]
    public async Task<IActionResult> SetOccurrenceException(
        Guid appointmentId, DateOnly date, SetOccurrenceExceptionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var appointment = await db.Appointments
            .Include(a => a.Exceptions)
            .FirstOrDefaultAsync(a => a.FamilyId == familyId && a.Id == appointmentId, cancellationToken);
        if (appointment is null) return NotFound();

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
        return NoContent();
    }

    /// <summary>Convenience for the common case: skip just this one occurrence.</summary>
    [HttpDelete("appointments/{appointmentId:guid}/occurrences/{date}")]
    public Task<IActionResult> SkipOccurrence(Guid appointmentId, DateOnly date, CancellationToken cancellationToken) =>
        SetOccurrenceException(appointmentId, date, new SetOccurrenceExceptionRequest(true, null, null, null, null), cancellationToken);

    /// <summary>Imports events from an uploaded .ics file as Appointments in the given calendar Collection.</summary>
    [HttpPost("collections/{collectionId:guid}/import")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ImportIcsResult>> Import(Guid collectionId, IFormFile file, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var collectionExists = await db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == collectionId, cancellationToken);
        if (!collectionExists) return NotFound();

        if (file.Length == 0) return Problem(title: "Empty file", statusCode: StatusCodes.Status400BadRequest);

        string icsText;
        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            icsText = await reader.ReadToEndAsync(cancellationToken);
        }

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
                CreatedByUserId = CurrentUserId,
            });
        }

        await db.SaveChangesAsync(cancellationToken);
        return Ok(new ImportIcsResult(parsedEvents.Count));
    }
}
