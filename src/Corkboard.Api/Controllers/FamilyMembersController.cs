using Corkboard.Api.Common;
using Corkboard.Application.FamilyMembers;
using Corkboard.Contracts.FamilyMembers;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/family-members")]
public class FamilyMembersController(IFamilyMemberService familyMemberService) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilyMemberResponse>>> List(CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        return Ok(await familyMemberService.ListAsync(familyId, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await familyMemberService.GetAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<FamilyMemberResponse>> Create(CreateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var response = await familyMemberService.CreateAsync(familyId, request, cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = response.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Update(Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await familyMemberService.UpdateAsync(familyId, id, request, cancellationToken);
        return result.ToActionResult(this);
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

        var result = await familyMemberService.CreateAccountAsync(familyId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await familyMemberService.DeleteAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }
}
