using Corkboard.Contracts.Setup;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/setup")]
public class SetupController(CorkboardDbContext db) : ControllerBase
{
    /// <summary>
    /// Whether this Corkboard instance already has a Family set up. Drives the
    /// client's first-run wizard framing on the login page — once a Family
    /// exists, the client behaves like an ordinary login screen. Anonymous
    /// since the client needs this before anyone can authenticate.
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<ActionResult<SetupStatusResponse>> Status(CancellationToken cancellationToken)
    {
        var isConfigured = await db.Families.AnyAsync(cancellationToken);
        return Ok(new SetupStatusResponse(isConfigured));
    }
}
