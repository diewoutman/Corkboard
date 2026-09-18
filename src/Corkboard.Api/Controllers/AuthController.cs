using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Contracts.Auth;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/auth")]
[EnableRateLimiting(RateLimiterPolicies.Auth)]
public class AuthController(
    CorkboardDbContext db,
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService) : ControllerBase
{
    /// <summary>
    /// Open only for the very first user, who registers before any Family
    /// exists (see the first-run wizard, CONCEPT.md §8). Once a Family has been
    /// set up, further accounts are created by its Owner via
    /// POST /api/family-members/{id}/account instead — self-registration on a
    /// configured instance would let a stranger spin up an unrelated Family.
    /// </summary>
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        if (await db.Families.AnyAsync(cancellationToken))
        {
            return Problem(
                title: "Registration is closed",
                detail: "This Corkboard is already set up — ask your family's Owner to create your account.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        var user = new ApplicationUser
        {
            UserName = request.Email,
            Email = request.Email,
            // This is checked above (`!Families.AnyAsync()`) to be the very first
            // user on this instance — grant them the system-owner flag once, here.
            IsSystemOwner = true,
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return result.ToValidationProblem(this);

        var response = await tokenService.CreateTokenAsync(user, cancellationToken);
        return CreatedAtAction(nameof(Register), response);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);

        // Checked before verifying the password (rather than folded into the
        // failure branch below) so a locked-out account doesn't keep spending a
        // password hash computation per attempt while it's locked.
        if (user is not null && await userManager.IsLockedOutAsync(user))
        {
            return Problem(
                title: "Account temporarily locked",
                detail: "Too many failed login attempts. Try again in a few minutes.",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            // Only tracked when the account exists — UserManager.AccessFailedAsync
            // requires a real user, and a nonexistent email should behave the same
            // as a wrong password anyway (no account for an attacker to lock out).
            if (user is not null) await userManager.AccessFailedAsync(user);

            return Problem(
                title: "Invalid credentials",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        if (user.AccessFailedCount > 0) await userManager.ResetAccessFailedCountAsync(user);

        var response = await tokenService.CreateTokenAsync(user, cancellationToken);
        return Ok(response);
    }
}
