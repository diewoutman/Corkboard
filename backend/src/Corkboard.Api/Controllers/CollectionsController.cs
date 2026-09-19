using Corkboard.Api.Common;
using Corkboard.Application.Collections;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Collections;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/collections")]
[RequireScope(ApiScopes.Collections)]
public class CollectionsController(ICollectionService collectionService) : FamilyScopedControllerBase
{
    /// <summary>Lists Collections in the caller's Family, optionally filtered by type or parent.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CollectionResponse>>> List(
        [FromQuery] CollectionType? type,
        [FromQuery] Guid? parentCollectionId,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var projections = await collectionService.ListAsync(familyId, CurrentUserId, type, parentCollectionId, cancellationToken);
        return Ok(projections.Select(ToResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.GetAsync(familyId, CurrentUserId, id, cancellationToken);
        return result.Map(ToResponse).ToActionResult(this);
    }

    [HttpPost]
    public async Task<ActionResult<CollectionResponse>> Create(CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.CreateAsync(familyId, CurrentUserId, request, cancellationToken);
        return result.Map(ToResponse).ToCreatedActionResult(this, nameof(Get), r => new { id = r.Id });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Update(Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.UpdateAsync(familyId, CurrentUserId, id, request, cancellationToken);
        return result.Map(ToResponse).ToActionResult(this);
    }

    /// <summary>
    /// (Re)generates the Collection's iCal feed token and returns its full
    /// subscribe URL — calendar apps can't do an interactive login, so the feed
    /// endpoint authenticates via this opaque token instead of a JWT. Calling
    /// this again invalidates any previously shared URL.
    /// </summary>
    [HttpPost("{id:guid}/feed-token")]
    public async Task<ActionResult<CollectionResponse>> RotateFeedToken(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.RotateFeedTokenAsync(familyId, CurrentUserId, id, cancellationToken);
        return result.Map(ToResponse).ToActionResult(this);
    }

    /// <summary>Deleting a Collection deletes the Nodes in it; blocked while it still has child Collections.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.DeleteAsync(familyId, CurrentUserId, id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpGet("{id:guid}/sections")]
    public async Task<ActionResult<IReadOnlyList<SectionResponse>>> ListSections(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        return Ok(await collectionService.ListSectionsAsync(familyId, CurrentUserId, id, cancellationToken));
    }

    /// <summary>Creates a Section, or returns the existing one with the same name (case-insensitive) — quick-add's "#tag" relies on that.</summary>
    [HttpPost("{id:guid}/sections")]
    public async Task<ActionResult<SectionResponse>> CreateSection(Guid id, CreateSectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.CreateSectionAsync(familyId, CurrentUserId, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPut("sections/{sectionId:guid}")]
    public async Task<ActionResult<SectionResponse>> UpdateSection(Guid sectionId, UpdateSectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.UpdateSectionAsync(familyId, CurrentUserId, sectionId, request, cancellationToken);
        return result.ToActionResult(this);
    }

    /// <summary>Its Tasks stay in the list, without a section.</summary>
    [HttpDelete("sections/{sectionId:guid}")]
    public async Task<IActionResult> DeleteSection(Guid sectionId, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await collectionService.DeleteSectionAsync(familyId, CurrentUserId, sectionId, cancellationToken);
        return result.ToActionResult(this);
    }

    private CollectionResponse ToResponse(CollectionProjection p) => new(
        p.Id, p.Name, (CollectionType)p.Type, p.Color, p.ParentCollectionId, p.CreatedAt,
        p.NodeCount, p.IncompleteCount,
        p.FeedToken is null ? null : $"{Request.Scheme}://{Request.Host}/api/calendar-feed/{p.Id}/{p.FeedToken}.ics",
        p.Street, p.City, p.PostalCode, p.Country,
        (Corkboard.Contracts.Collections.CollectionScope)p.Scope, p.IsInbox, p.IsSystemManaged);
}
