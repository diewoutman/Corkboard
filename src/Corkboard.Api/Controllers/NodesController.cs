using Corkboard.Api.Common;
using Corkboard.Application.Nodes;
using Corkboard.Contracts.Nodes;
using Microsoft.AspNetCore.Mvc;
using ContractNodeType = Corkboard.Contracts.Nodes.NodeType;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/nodes")]
public class NodesController(INodeService nodeService) : FamilyScopedControllerBase
{
    /// <summary>
    /// Lists Nodes in the caller's Family, optionally filtered by type, assignee,
    /// containing Collection, and a From/Until window. The window filter treats a
    /// null From/Until on a Node as open-ended (a plain Note has neither) rather
    /// than excluding it.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NodeResponse>>> List(
        [FromQuery] ContractNodeType? type,
        [FromQuery] Guid? assignedTo,
        [FromQuery] Guid? collectionId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? until,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var filter = new NodeListFilter(type, assignedTo, collectionId, from, until);
        return Ok(await nodeService.ListAsync(familyId, filter, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NodeResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.GetAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<NodeResponse>> Create(CreateNodeRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.CreateAsync(familyId, CurrentUserId, request, cancellationToken);
        return result.ToCreatedActionResult(this, nameof(Get), node => new { id = node.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<NodeResponse>> Update(Guid id, UpdateNodeRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.UpdateAsync(familyId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.DeleteAsync(familyId, id, cancellationToken);
        return result.ToActionResult(this);
    }
}
