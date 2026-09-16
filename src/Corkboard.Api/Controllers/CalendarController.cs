using Corkboard.Api.Common;
using Corkboard.Application.Calendar;
using Corkboard.Contracts.Collections;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/calendar")]
public class CalendarController(ICalendarService calendarService) : FamilyScopedControllerBase
{
    [HttpGet("occurrences")]
    public async Task<ActionResult<IReadOnlyList<OccurrenceResponse>>> Occurrences(
        [FromQuery] DateTimeOffset from,
        [FromQuery] DateTimeOffset until,
        [FromQuery] Guid? calendarId,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        return Ok(await calendarService.GetOccurrencesAsync(familyId, from, until, calendarId, cancellationToken));
    }

    [HttpPut("appointments/{appointmentId:guid}/occurrences/{date}")]
    public async Task<IActionResult> SetOccurrenceException(
        Guid appointmentId, DateOnly date, SetOccurrenceExceptionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await calendarService.SetOccurrenceExceptionAsync(familyId, appointmentId, date, request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>Convenience for the common case: skip just this one occurrence.</summary>
    [HttpDelete("appointments/{appointmentId:guid}/occurrences/{date}")]
    public async Task<IActionResult> SkipOccurrence(Guid appointmentId, DateOnly date, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await calendarService.SetOccurrenceExceptionAsync(
            familyId, appointmentId, date, new SetOccurrenceExceptionRequest(true, null, null, null, null), cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>Imports events from an uploaded .ics file as Appointments in the given calendar Collection.</summary>
    [HttpPost("collections/{collectionId:guid}/import")]
    [RequestSizeLimit(5 * 1024 * 1024)]
    public async Task<ActionResult<ImportIcsResult>> Import(Guid collectionId, IFormFile file, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        if (file.Length == 0) return Problem(title: "Empty file", statusCode: StatusCodes.Status400BadRequest);

        string icsText;
        using (var reader = new StreamReader(file.OpenReadStream()))
        {
            icsText = await reader.ReadToEndAsync(cancellationToken);
        }

        var result = await calendarService.ImportAsync(familyId, CurrentUserId, collectionId, icsText, cancellationToken);
        return result.ToActionResult(this);
    }
}
