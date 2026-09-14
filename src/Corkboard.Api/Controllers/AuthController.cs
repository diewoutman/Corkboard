using Corkboard.Api.Auth;
using Corkboard.Contracts.Auth;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/auth")]
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
        };

        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        var response = await tokenService.CreateTokenAsync(user, cancellationToken);
        return CreatedAtAction(nameof(Register), response);
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var user = await userManager.FindByEmailAsync(request.Email);
        if (user is null || !await userManager.CheckPasswordAsync(user, request.Password))
        {
            return Problem(
                title: "Invalid credentials",
                statusCode: StatusCodes.Status401Unauthorized);
        }

        var response = await tokenService.CreateTokenAsync(user, cancellationToken);
        return Ok(response);
    }
}
