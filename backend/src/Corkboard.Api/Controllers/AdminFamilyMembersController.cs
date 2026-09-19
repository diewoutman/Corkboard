using Corkboard.Application.Common;
using Corkboard.Api.Common;
using Corkboard.Application.FamilyMembers;
using Corkboard.Contracts.FamilyMembers;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>
/// System-owner-only FamilyMember management for a Family the caller isn't
/// necessarily a member of — mirrors FamilyMembersController action-for-action,
/// delegating to the same IFamilyMemberService, but takes familyId from the
/// route instead of the caller's own JWT claim.
/// </summary>
[ApiController]
[Route("api/admin/families/{familyId:guid}/members")]
public class AdminFamilyMembersController(IFamilyMemberService familyMemberService) : SystemOwnerControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilyMemberResponse>>> List(Guid familyId, [FromQuery] PageQuery paging, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        return this.PagedOk(await familyMemberService.ListAsync(familyId, paging.ToRequest(), cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Get(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyMemberService.GetAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<FamilyMemberResponse>> Create(Guid familyId, CreateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var response = await familyMemberService.CreateAsync(familyId, request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { familyId, id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Update(Guid familyId, Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyMemberService.UpdateAsync(familyId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>Creating a login isn't gated on being "the Owner" here — the class-level system-owner check already covers it.</summary>
    [HttpPost("{id:guid}/account")]
    public async Task<ActionResult<FamilyMemberResponse>> CreateAccount(Guid familyId, Guid id, CreateFamilyMemberAccountRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyMemberService.CreateAccountAsync(familyId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyMemberService.DeleteAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }
}
