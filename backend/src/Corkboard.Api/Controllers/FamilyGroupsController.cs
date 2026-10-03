using Corkboard.Api.Common;
using Corkboard.Application.FamilyGroups;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.FamilyGroups;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController, Route("api/family-groups"), RequireScope(ApiScopes.Family)]
public class FamilyGroupsController(IFamilyGroupService service) : FamilyScopedControllerBase
{
    [HttpGet] public async Task<ActionResult<IReadOnlyList<FamilyGroupResponse>>> List(CancellationToken ct) => CurrentFamilyId is not { } id ? NoFamilyProblem() : Ok(await service.ListAsync(id, ct));
    [HttpGet("{id:guid}")] public async Task<ActionResult<FamilyGroupResponse>> Get(Guid id, CancellationToken ct) => CurrentFamilyId is not { } familyId ? NoFamilyProblem() : (await service.GetAsync(familyId, id, ct)).ToActionResult(this);
    [HttpPost] public async Task<ActionResult<FamilyGroupResponse>> Create(CreateFamilyGroupRequest request, CancellationToken ct) { if (CurrentFamilyId is not { } id) return NoFamilyProblem(); var result = await service.CreateAsync(id, request, ct); return CreatedAtAction(nameof(Get), new { id = result.Id }, result); }
    [HttpPut("{id:guid}")] public async Task<ActionResult<FamilyGroupResponse>> Update(Guid id, UpdateFamilyGroupRequest request, CancellationToken ct) => CurrentFamilyId is not { } familyId ? NoFamilyProblem() : (await service.UpdateAsync(familyId, id, request, ct)).ToActionResult(this);
    [HttpPut("{id:guid}/members")] public async Task<ActionResult<FamilyGroupResponse>> AssignMembers(Guid id, AssignFamilyGroupMembersRequest request, CancellationToken ct) => CurrentFamilyId is not { } familyId ? NoFamilyProblem() : (await service.AssignMembersAsync(familyId, id, request, ct)).ToActionResult(this);
    [HttpDelete("{id:guid}")] public async Task<IActionResult> Delete(Guid id, CancellationToken ct) => CurrentFamilyId is not { } familyId ? NoFamilyProblem() : (await service.DeleteAsync(familyId, id, ct)).ToActionResult(this);
}
