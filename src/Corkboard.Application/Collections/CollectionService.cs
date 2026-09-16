using System.Security.Cryptography;
using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainCollectionType = Corkboard.Domain.Entities.CollectionType;

namespace Corkboard.Application.Collections;

public class CollectionService(CorkboardDbContext db) : ICollectionService
{
    public async Task<IReadOnlyList<CollectionProjection>> ListAsync(Guid familyId, CollectionType? type, Guid? parentCollectionId, CancellationToken cancellationToken)
    {
        var query = db.Collections.Where(c => c.FamilyId == familyId);

        if (type is { } typeValue)
        {
            var domainType = (DomainCollectionType)typeValue;
            query = query.Where(c => c.Type == domainType);
        }

        query = parentCollectionId is { } parentId
            ? query.Where(c => c.ParentCollectionId == parentId)
            : query.Where(c => c.ParentCollectionId == null);

        return await query.OrderBy(c => c.Name).Select(ToProjectionExpression).ToListAsync(cancellationToken);
    }

    public async Task<Result<CollectionProjection>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var projection = await db.Collections
            .Where(c => c.FamilyId == familyId && c.Id == id)
            .Select(ToProjectionExpression)
            .FirstOrDefaultAsync(cancellationToken);

        return projection is null ? Result<CollectionProjection>.Failure(Error.NotFound()) : Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result<CollectionProjection>> CreateAsync(Guid familyId, Guid userId, CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (!await CollectionValidation.ExistsAsync(db, familyId, request.ParentCollectionId, cancellationToken))
        {
            return Result<CollectionProjection>.Failure(Error.BadRequest(
                "Invalid parent collection", "ParentCollectionId doesn't belong to this Family."));
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
            CreatedByUserId = userId,
        };

        db.Collections.Add(collection);
        await db.SaveChangesAsync(cancellationToken);

        var projection = new CollectionProjection(
            collection.Id, collection.Name, collection.Type, collection.Color, collection.ParentCollectionId,
            collection.CreatedAt, NodeCount: 0, IncompleteCount: collection.Type == DomainCollectionType.TaskList ? 0 : null,
            collection.FeedToken,
            collection.Address?.Street, collection.Address?.City, collection.Address?.PostalCode, collection.Address?.Country);

        return Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result<CollectionProjection>> UpdateAsync(Guid familyId, Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.Include(c => c.Address)
            .FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result<CollectionProjection>.Failure(Error.NotFound());

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
        return Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result<CollectionProjection>> RotateFeedTokenAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result<CollectionProjection>.Failure(Error.NotFound());

        collection.FeedToken = GenerateFeedToken();
        await db.SaveChangesAsync(cancellationToken);

        var projection = await db.Collections.Where(c => c.Id == id).Select(ToProjectionExpression).FirstAsync(cancellationToken);
        return Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result.Failure(Error.NotFound());

        if (await db.Collections.AnyAsync(c => c.ParentCollectionId == id, cancellationToken))
        {
            return Result.Failure(Error.Conflict(
                "Collection has children", "Remove or move its child collections first."));
        }

        db.Collections.Remove(collection);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private static string GenerateFeedToken() => Convert.ToHexString(RandomNumberGenerator.GetBytes(24)).ToLowerInvariant();

    /// <summary>Null when every field is unset — keeps a Collection without an address from getting an empty row.</summary>
    private static Domain.Entities.CollectionAddress? BuildAddress(string? street, string? city, string? postalCode, string? country) =>
        street is null && city is null && postalCode is null && country is null
            ? null
            : new Domain.Entities.CollectionAddress { Street = street, City = city, PostalCode = postalCode, Country = country };

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
