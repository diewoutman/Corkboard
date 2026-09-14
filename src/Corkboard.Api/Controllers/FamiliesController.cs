using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Contracts.Auth;
using Corkboard.Contracts.Families;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/families")]
public class FamiliesController(
    CorkboardDbContext db,
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService) : ControllerBase
{
    /// <summary>
    /// Creates the caller's Family plus the FamilyMember representing them in it
    /// (as Owner), and returns a fresh token carrying the new FamilyId claim —
    /// the "Family setup, seeded on first run" MVP flow (CONCEPT.md §5/§8).
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<AuthenticatedFamilyResponse>> Create(CreateFamilyRequest request, CancellationToken cancellationToken)
    {
        var userId = User.GetUserId();

        var alreadyHasFamily = await db.UserFamilies.AnyAsync(uf => uf.UserId == userId, cancellationToken);
        if (alreadyHasFamily)
        {
            return Problem(
                title: "Already in a family",
                detail: "This account already belongs to a Family.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var now = DateTimeOffset.UtcNow;
        var family = new Family
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            TimeZone = request.TimeZone,
            CreatedAt = now,
        };

        db.Families.Add(family);
        db.UserFamilies.Add(new UserFamily
        {
            UserId = userId,
            FamilyId = family.Id,
            Role = FamilyRole.Owner,
        });
        db.FamilyMembers.Add(new FamilyMember
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            DisplayName = request.OwnerDisplayName,
            Color = request.OwnerColor,
            LinkedUserId = userId,
        });

        await db.SaveChangesAsync(cancellationToken);

        var user = await userManager.FindByIdAsync(userId.ToString())
            ?? throw new InvalidOperationException("Authenticated user not found.");
        var auth = await tokenService.CreateTokenAsync(user, cancellationToken);

        var familyResponse = new FamilyResponse(family.Id, family.Name, family.TimeZone, family.CreatedAt);
        return CreatedAtAction(nameof(Mine), new AuthenticatedFamilyResponse(familyResponse, auth));
    }

    [HttpGet("mine")]
    public async Task<ActionResult<FamilyResponse>> Mine(CancellationToken cancellationToken)
    {
        var familyId = User.GetFamilyId();
        if (familyId is null)
        {
            return Problem(
                title: "No family set up yet",
                detail: "Call POST /api/families first, then use the token it returns.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var family = await db.Families
            .AsNoTracking()
            .Where(f => f.Id == familyId)
            .Select(f => new FamilyResponse(f.Id, f.Name, f.TimeZone, f.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        return family is null ? NotFound() : Ok(family);
    }
}

/// <summary>The new Family plus a fresh token carrying its FamilyId claim.</summary>
public record AuthenticatedFamilyResponse(FamilyResponse Family, AuthResponse AuthResponse);
