using Corkboard.Api.Common;
using Corkboard.Application.Nodes;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Nodes;
using Microsoft.AspNetCore.Mvc;
using ContractNodeType = Corkboard.Contracts.Nodes.NodeType;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/nodes")]
[RequireScope(ApiScopes.Nodes)]
public class NodesController(INodeService nodeService) : FamilyScopedControllerBase
{
    /// <summary>
    /// Lists Nodes in the caller's Family, optionally filtered by type, assignee,
    /// containing Collection, and a From/Until window. The window filter treats a
    /// null From/Until on a Node as open-ended (a plain Note has neither) rather
    /// than excluding it. Further filters: isCompleted/sectionId/priority (Tasks only),
    /// dueFrom/dueUntil (Until set and ≥ / <; a null Until never matches), isImportant (Notes only),
    /// unfiled (only Nodes with no Collection at all — distinct from omitting collectionId, which leaves every Collection unfiltered),
    /// scope (Family/Personal) and a case-insensitive search over title and description.
    /// sort is createdAt (default), updatedAt, title, due, until, priority, important (Notes) or name (Contacts), "-" prefix for
    /// descending. Like every list endpoint it is paged (page, pageSize ≤ 50, default 50);
    /// the body is a plain array and the total match count is in the X-Total-Count header.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NodeResponse>>> List(
        [FromQuery] ContractNodeType? type,
        [FromQuery] Guid? assignedTo,
        [FromQuery] Guid? collectionId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? until,
        [FromQuery] bool? isCompleted,
        [FromQuery] Corkboard.Contracts.Collections.CollectionScope? scope,
        [FromQuery] Guid? sectionId,
        [FromQuery] int? priority,
        [FromQuery] string? search,
        [FromQuery] string? sort,
        [FromQuery] PageQuery paging,
        [FromQuery] DateTimeOffset? dueFrom,
        [FromQuery] DateTimeOffset? dueUntil,
        [FromQuery] bool? isImportant,
        [FromQuery] bool? unfiled,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        if (!NodeSortKeys.IsValid(sort))
        {
            ModelState.AddModelError(nameof(sort), $"sort must be one of {string.Join(", ", NodeSortKeys.All)}, optionally prefixed with '-'.");
            return ValidationProblem(ModelState);
        }

        var filter = new NodeListFilter(type, assignedTo, collectionId, from, until, isCompleted, scope, sectionId, priority, search, sort, paging.ToRequest(), dueFrom, dueUntil, isImportant, unfiled);
        return this.PagedOk(await nodeService.ListAsync(familyId, CurrentUserId, filter, cancellationToken));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NodeResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.GetAsync(familyId, CurrentUserId, id, cancellationToken);
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

        var result = await nodeService.UpdateAsync(familyId, CurrentUserId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await nodeService.DeleteAsync(familyId, CurrentUserId, id, cancellationToken);
        return result.ToActionResult(this);
    }
}
