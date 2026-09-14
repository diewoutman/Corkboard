using Corkboard.Infrastructure.Ics;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

/// <summary>
/// Anonymous — calendar apps subscribing via webcal:// can't do an interactive
/// JWT login, so the feed token in the URL itself (see
/// CollectionsController.RotateFeedToken) is the only auth here. Scoped
/// implicitly: a request only succeeds if the token matches that exact
/// Collection, so guessing a Collection id alone gets nothing.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/calendar-feed")]
public class CalendarFeedController(CorkboardDbContext db, IcsExportService icsExport) : ControllerBase
{
    [HttpGet("{collectionId:guid}/{token}.ics")]
    public async Task<IActionResult> Feed(Guid collectionId, string token, CancellationToken cancellationToken)
    {
        var collection = await db.Collections
            .FirstOrDefaultAsync(c => c.Id == collectionId && c.FeedToken == token, cancellationToken);
        if (collection is null) return NotFound();

        var appointments = await db.Appointments
            .Include(a => a.Exceptions)
            .Where(a => a.CollectionId == collectionId)
            .ToListAsync(cancellationToken);

        var ics = icsExport.Serialize(collection, appointments);
        return Content(ics, "text/calendar");
    }
}
