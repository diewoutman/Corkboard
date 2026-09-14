using System.Security.Cryptography;
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

        query = parentCollectionId is { } parentId
            ? query.Where(c => c.ParentCollectionId == parentId)
            : query.Where(c => c.ParentCollectionId == null);

        var projections = await query.OrderBy(c => c.Name).Select(ToProjectionExpression).ToListAsync(cancellationToken);
        return Ok(projections.Select(ToResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var projection = await db.Collections
            .Where(c => c.FamilyId == familyId && c.Id == id)
            .Select(ToProjectionExpression)
            .FirstOrDefaultAsync(cancellationToken);

        return projection is null ? NotFound() : Ok(ToResponse(projection));
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
            Color = request.Color,
            ParentCollectionId = request.ParentCollectionId,
            Address = BuildAddress(request.Street, request.City, request.PostalCode, request.Country),
            CreatedAt = now,
            UpdatedAt = now,
            CreatedByUserId = CurrentUserId,
        };

        db.Collections.Add(collection);
        await db.SaveChangesAsync(cancellationToken);

        var response = new CollectionResponse(
            collection.Id, collection.Name, request.Type, collection.Color, collection.ParentCollectionId,
            collection.CreatedAt, NodeCount: 0, IncompleteCount: request.Type == CollectionType.TaskList ? 0 : null,
            FeedUrl: null,
            collection.Address?.Street, collection.Address?.City, collection.Address?.PostalCode, collection.Address?.Country);

        return CreatedAtAction(nameof(Get), new { id = collection.Id }, response);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<CollectionResponse>> Update(Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var collection = await db.Collections.Include(c => c.Address)
            .FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return NotFound();

        collection.Name = request.Name;
        collection.Color = request.Color;
        collection.UpdatedAt = DateTimeOffset.UtcNow;

        var hasAddress = request.Street != null || request.City != null || request.PostalCode != null || request.Country != null;
        if (hasAddress)
        {
            collection.Address ??= new Domain.Entities.CollectionAddress { CollectionId = collection.Id };
            collection.Address.Street = request.Street;
            collection.Address.City = request.City;
            collection.Address.PostalCode = request.PostalCode;
            collection.Address.Country = request.Country;
        }
        else if (collection.Address is not null)
        {
            db.CollectionAddresses.Remove(collection.Address);
            collection.Address = null;
        }

        await db.SaveChangesAsync(cancellationToken);

        var projection = await db.Collections.Where(c => c.Id == id).Select(ToProjectionExpression).FirstAsync(cancellationToken);
        return Ok(ToResponse(projection));
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

        var collection = await db.Collections.FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return NotFound();

        collection.FeedToken = GenerateFeedToken();
        await db.SaveChangesAsync(cancellationToken);

        var projection = await db.Collections.Where(c => c.Id == id).Select(ToProjectionExpression).FirstAsync(cancellationToken);
        return Ok(ToResponse(projection));
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

    private static string GenerateFeedToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();

    /// <summary>Null when every field is unset — keeps a Collection without an address from getting an empty row.</summary>
    private static Domain.Entities.CollectionAddress? BuildAddress(string? street, string? city, string? postalCode, string? country) =>
        street is null && city is null && postalCode is null && country is null
            ? null
            : new Domain.Entities.CollectionAddress { Street = street, City = city, PostalCode = postalCode, Country = country };

    private CollectionResponse ToResponse(CollectionProjection p) => new(
        p.Id, p.Name, (CollectionType)p.Type, p.Color, p.ParentCollectionId, p.CreatedAt,
        p.NodeCount, p.IncompleteCount,
        p.FeedToken is null ? null : $"{Request.Scheme}://{Request.Host}/api/calendar-feed/{p.Id}/{p.FeedToken}.ics",
        p.Street, p.City, p.PostalCode, p.Country);

    private record CollectionProjection(
        Guid Id, string Name, DomainCollectionType Type, string Color, Guid? ParentCollectionId,
        DateTimeOffset CreatedAt, int NodeCount, int? IncompleteCount, string? FeedToken,
        string? Street, string? City, string? PostalCode, string? Country);

    private static readonly System.Linq.Expressions.Expression<Func<Domain.Entities.Collection, CollectionProjection>> ToProjectionExpression =
        c => new CollectionProjection(
            c.Id, c.Name, c.Type, c.Color, c.ParentCollectionId, c.CreatedAt,
            c.Nodes.Count,
            c.Type == DomainCollectionType.TaskList
                ? c.Nodes.OfType<Domain.Entities.TaskNode>().Count(n => !n.IsCompleted)
                : (int?)null,
            c.FeedToken,
            c.Address != null ? c.Address.Street : null,
            c.Address != null ? c.Address.City : null,
            c.Address != null ? c.Address.PostalCode : null,
            c.Address != null ? c.Address.Country : null);
}
