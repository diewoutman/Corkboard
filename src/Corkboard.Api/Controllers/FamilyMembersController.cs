using Corkboard.Api.Common;
using Corkboard.Contracts.FamilyMembers;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContractFamilyRole = Corkboard.Contracts.FamilyMembers.FamilyRole;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/family-members")]
public class FamilyMembersController(CorkboardDbContext db, UserManager<ApplicationUser> userManager) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilyMemberResponse>>> List(CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var members = await db.FamilyMembers.AsNoTracking().Where(m => m.FamilyId == familyId).ToListAsync(cancellationToken);
        var linkedAccounts = await GetLinkedAccountsAsync(familyId, members, cancellationToken);

        return Ok(members.Select(m => ToResponseValue(m, linkedAccounts)).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers.AsNoTracking().FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Ok(ToResponseValue(member, linkedAccounts));
    }

    [HttpPost]
    public async Task<ActionResult<FamilyMemberResponse>> Create(CreateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = new FamilyMember
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            DisplayName = request.DisplayName,
            Color = request.Color,
            AvatarUrl = request.AvatarUrl,
            LinkedUserId = request.LinkedUserId,
            DateOfBirth = request.DateOfBirth,
        };

        db.FamilyMembers.Add(member);
        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = member.Id }, ToResponseValue(member, linkedAccounts));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Update(Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        member.DisplayName = request.DisplayName;
        member.Color = request.Color;
        member.AvatarUrl = request.AvatarUrl;
        member.LinkedUserId = request.LinkedUserId;
        member.DateOfBirth = request.DateOfBirth;

        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Ok(ToResponseValue(member, linkedAccounts));
    }

    /// <summary>
    /// Creates a login for a FamilyMember who doesn't have one yet — Owner-only,
    /// and the sanctioned replacement for self-registration once a Family exists
    /// (see AuthController.Register). Role can't be Owner; there's only ever one,
    /// set when the Family itself was created.
    /// </summary>
    [HttpPost("{id:guid}/account")]
    public async Task<ActionResult<FamilyMemberResponse>> CreateAccount(Guid id, CreateFamilyMemberAccountRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();
        if (!CurrentUserIsOwner)
        {
            return Problem(
                title: "Owner only",
                detail: "Only the family's Owner can create logins for other family members.",
                statusCode: StatusCodes.Status403Forbidden);
        }

        if (request.Role == ContractFamilyRole.Owner)
        {
            return Problem(
                title: "Invalid role",
                detail: "A family has exactly one Owner, set when it was created.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        if (member.LinkedUserId is not null)
        {
            return Problem(
                title: "Already has an account",
                detail: "This family member already has a login.",
                statusCode: StatusCodes.Status409Conflict);
        }

        var user = new ApplicationUser { UserName = request.Email, Email = request.Email };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
        {
            foreach (var error in result.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        db.UserFamilies.Add(new UserFamily { UserId = user.Id, FamilyId = familyId, Role = (Domain.Entities.FamilyRole)request.Role });
        member.LinkedUserId = user.Id;
        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Ok(ToResponseValue(member, linkedAccounts));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        db.FamilyMembers.Remove(member);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private record LinkedAccount(string? Email, Domain.Entities.FamilyRole? Role);

    /// <summary>Bulk-fetches email/role for whichever of the given members have a LinkedUserId.</summary>
    private async Task<Dictionary<Guid, LinkedAccount>> GetLinkedAccountsAsync(Guid familyId, IReadOnlyList<FamilyMember> members, CancellationToken cancellationToken)
    {
        var userIds = members.Where(m => m.LinkedUserId is not null).Select(m => m.LinkedUserId!.Value).Distinct().ToList();
        if (userIds.Count == 0) return [];

        var emailsById = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email, cancellationToken);

        var rolesById = await db.UserFamilies.AsNoTracking()
            .Where(uf => uf.FamilyId == familyId && userIds.Contains(uf.UserId))
            .ToDictionaryAsync(uf => uf.UserId, uf => uf.Role, cancellationToken);

        return userIds.ToDictionary(
            id => id,
            id => new LinkedAccount(
                emailsById.GetValueOrDefault(id),
                rolesById.TryGetValue(id, out var role) ? role : null));
    }

    private static FamilyMemberResponse ToResponseValue(FamilyMember m, IReadOnlyDictionary<Guid, LinkedAccount> linkedAccounts)
    {
        var linked = m.LinkedUserId is { } userId && linkedAccounts.TryGetValue(userId, out var account) ? account : null;
        return new FamilyMemberResponse(
            m.Id, m.DisplayName, m.Color, m.AvatarUrl, m.LinkedUserId, m.DateOfBirth,
            linked?.Email, (ContractFamilyRole?)linked?.Role);
    }
}
