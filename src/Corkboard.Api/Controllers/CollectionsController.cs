using Corkboard.Api.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using DomainCollectionType = Corkboard.Domain.Entities.CollectionType;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/collections")]
public class CollectionsController(CorkboardDbContext db) : FamilyScopedControllerBase
{
    /// <summary>Lists Collections in the caller's Family, optionally filtered by type or parent.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<CollectionResponse>>> List(
        [FromQuery] CollectionType? type,
        [FromQuery] Guid? parentCollectionId,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var query = db.Collections.Where(c => c.FamilyId == familyId);

        if (type is { } typeValue)
        {
            var domainType = (DomainCollectionType)typeValue;
            query = query.Where(c => c.Type == domainType);
        }

        // Explicitly distinguish "only top-level" (parentCollectionId omitted) from
        // "children of this parent" (parentCollectionId given) — both are common
        // callers (the Lists overview vs. drilling into a parent).
        query = parentCollectionId is { } parentId
            ? query.Where(c => c.ParentCollectionId == parentId)
            : query.Where(c => c.ParentCollectionId == null);

        var collections = await query
            .OrderBy(c => c.Name)
            .Select(ToResponseExpression)
            .ToListAsync(cancellationToken);

        return Ok(collections);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var collection = await db.Collections
            .Where(c => c.FamilyId == familyId && c.Id == id)
            .Select(ToResponseExpression)
            .FirstOrDefaultAsync(cancellationToken);

        return collection is null ? NotFound() : Ok(collection);
    }

    [HttpPost]
    public async Task<ActionResult<CollectionResponse>> Create(CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        if (request.ParentCollectionId is { } parentId
            && !await db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == parentId, cancellationToken))
        {
            return Problem(
                title: "Invalid parent collection",
                detail: "ParentCollectionId doesn't belong to this Family.",
                statusCode: StatusCodes.Status400BadRequest);
        }

        var now = DateTimeOffset.UtcNow;
        var collection = new Domain.Entities.Collection
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            Name = request.Name,
            Type = (DomainCollectionType)request.Type,
            ParentCollectionId = request.ParentCollectionId,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedByUserId = CurrentUserId,
        };

        db.Collections.Add(collection);
        await db.SaveChangesAsync(cancellationToken);

        var response = new CollectionResponse(
            collection.Id, collection.Name, request.Type, collection.ParentCollectionId,
            collection.CreatedAt, NodeCount: 0, IncompleteCount: request.Type == CollectionType.TaskList ? 0 : null);

        return CreatedAtAction(nameof(Get), new { id = collection.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Update(Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var collection = await db.Collections.FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return NotFound();

        collection.Name = request.Name;
        collection.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        var response = await db.Collections
            .Where(c => c.Id == id)
            .Select(ToResponseExpression)
            .FirstAsync(cancellationToken);

        return Ok(response);
    }

    /// <summary>Deleting a Collection deletes the Nodes in it; blocked while it still has child Collections.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var collection = await db.Collections.FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return NotFound();

        if (await db.Collections.AnyAsync(c => c.ParentCollectionId == id, cancellationToken))
        {
            return Problem(
                title: "Collection has children",
                detail: "Remove or move its child collections first.",
                statusCode: StatusCodes.Status409Conflict);
        }

        db.Collections.Remove(collection);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static readonly System.Linq.Expressions.Expression<Func<Domain.Entities.Collection, CollectionResponse>> ToResponseExpression =
        c => new CollectionResponse(
            c.Id,
            c.Name,
            (CollectionType)c.Type,
            c.ParentCollectionId,
            c.CreatedAt,
            c.Nodes.Count,
            c.Type == DomainCollectionType.TaskList
                ? c.Nodes.OfType<Domain.Entities.TaskNode>().Count(n => !n.IsCompleted)
                : (int?)null);
}
