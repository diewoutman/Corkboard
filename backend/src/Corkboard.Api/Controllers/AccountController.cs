using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Contracts.Auth;
using Corkboard.Infrastructure.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>The signed-in person's own account settings (as opposed to Family management).</summary>
[ApiController]
[Route("api/account")]
[Authorize]
public class AccountController(
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService) : ControllerBase
{
    /// <summary>
    /// Stores the caller's UI language and returns a fresh token/AuthResponse carrying it,
    /// so the client can swap it in the same way it does after family setup.
    /// </summary>
    [HttpPut("language")]
    public async Task<ActionResult<AuthResponse>> UpdateLanguage(UpdateLanguageRequest request, CancellationToken cancellationToken)
    {
        // A client-credentials token has no human account behind it.
        if (User.IsScopedClient())
        {
            return Problem(
                title: "Not available to API clients",
                detail: "Language is a per-user setting.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var user = await userManager.FindByIdAsync(User.GetUserId().ToString());
        if (user is null) return NotFound();

        user.Language = request.Language;
        var result = await userManager.UpdateAsync(user);
        if (!result.Succeeded) return result.ToValidationProblem(this);

        return Ok(await tokenService.CreateTokenAsync(user, cancellationToken));
    }
}
