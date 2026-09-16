using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Application.Families;
using Corkboard.Contracts.Auth;
using Corkboard.Contracts.Families;
using Corkboard.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/families")]
public class FamiliesController(
    IFamilyService familyService,
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService) : FamilyScopedControllerBase
{
    /// <summary>
    /// Creates the caller's Family plus the FamilyMember representing them in it
    /// (as Owner), and returns a fresh token carrying the new FamilyId claim —
    /// the "Family setup, seeded on first run" MVP flow (CONCEPT.md §5/§8).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AuthenticatedFamilyResponse>> Create(CreateFamilyRequest request, CancellationToken cancellationToken)
    {
        var familyResult = await familyService.CreateAsync(CurrentUserId, request, cancellationToken);
        if (!familyResult.IsSuccess) return familyResult.Error!.ToActionResult<AuthenticatedFamilyResponse>(this);

        var user = await userManager.FindByIdAsync(CurrentUserId.ToString())
            ?? throw new InvalidOperationException("Authenticated user not found.");
        var auth = await tokenService.CreateTokenAsync(user, cancellationToken);

        return CreatedAtAction(nameof(Mine), new AuthenticatedFamilyResponse(familyResult.Value, auth));
    }

    [HttpGet("mine")]
    public async Task<ActionResult<FamilyResponse>> Mine(CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await familyService.GetMineAsync(familyId, cancellationToken);
        return result.ToActionResult(this);
    }
}

/// <summary>The new Family plus a fresh token carrying its FamilyId claim.</summary>
public record AuthenticatedFamilyResponse(FamilyResponse Family, AuthResponse AuthResponse);
