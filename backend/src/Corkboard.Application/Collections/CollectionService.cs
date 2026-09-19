using System.Security.Cryptography;
using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using DomainCollectionType = Corkboard.Domain.Entities.CollectionType;
using DomainScope = Corkboard.Domain.Entities.CollectionScope;

namespace Corkboard.Application.Collections;

public class CollectionService(CorkboardDbContext db) : ICollectionService
{
    public async Task<PagedResult<CollectionProjection>> ListAsync(Guid familyId, Guid userId, CollectionType? type, Guid? parentCollectionId, PageRequest page, CancellationToken cancellationToken)
    {
        if (type is null or CollectionType.TaskList) await EnsureInboxesAsync(familyId, userId, cancellationToken);

        var query = db.Collections.VisibleTo(userId).Where(c => c.FamilyId == familyId);

        if (type is { } typeValue)
        {
            var domainType = (DomainCollectionType)typeValue;
            query = query.Where(c => c.Type == domainType);
        }

        query = parentCollectionId is { } parentId
            ? query.Where(c => c.ParentCollectionId == parentId)
            : query.Where(c => c.ParentCollectionId == null);

        return await query.OrderByDescending(c => c.IsInbox).ThenBy(c => c.Name).ThenBy(c => c.Id).Select(ToProjectionExpression).ToPagedAsync(page, cancellationToken);
    }

    public async Task<Result<CollectionProjection>> GetAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var projection = await db.Collections.VisibleTo(userId)
            .Where(c => c.FamilyId == familyId && c.Id == id)
            .Select(ToProjectionExpression)
            .FirstOrDefaultAsync(cancellationToken);

        return projection is null ? Result<CollectionProjection>.Failure(Error.NotFound()) : Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result<CollectionProjection>> CreateAsync(Guid familyId, Guid userId, CreateCollectionRequest request, CancellationToken cancellationToken)
    {
        if (!await CollectionValidation.ExistsAsync(db, familyId, userId, request.ParentCollectionId, cancellationToken))
        {
            return Result<CollectionProjection>.Failure(Error.BadRequest(
                "Invalid parent collection", "ParentCollectionId doesn't belong to this Family."));
        }

        var scope = (DomainScope)request.Scope;
        if (scope == DomainScope.Personal && request.Type != CollectionType.TaskList)
        {
            return Result<CollectionProjection>.Failure(Error.BadRequest(
                "Invalid scope", "Only Task lists can be Personal."));
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
            Scope = scope,
            OwnerUserId = scope == DomainScope.Personal ? userId : null,
            IsSystemManaged = request.IsSystemManaged,
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
            collection.Address?.Street, collection.Address?.City, collection.Address?.PostalCode, collection.Address?.Country,
            collection.Scope, collection.IsInbox, collection.IsSystemManaged);

        return Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result<CollectionProjection>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.VisibleTo(userId).Include(c => c.Address)
            .FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result<CollectionProjection>.Failure(Error.NotFound());

        if (!collection.IsInbox) collection.Name = request.Name;
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

    public async Task<Result<CollectionProjection>> RotateFeedTokenAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.VisibleTo(userId).FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result<CollectionProjection>.Failure(Error.NotFound());

        collection.FeedToken = GenerateFeedToken();
        await db.SaveChangesAsync(cancellationToken);

        var projection = await db.Collections.Where(c => c.Id == id).Select(ToProjectionExpression).FirstAsync(cancellationToken);
        return Result<CollectionProjection>.Success(projection);
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.VisibleTo(userId).FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
        if (collection is null) return Result.Failure(Error.NotFound());

        if (collection.IsInbox)
        {
            return Result.Failure(Error.Conflict("Inbox can't be deleted", "Your Personal Inbox is always there."));
        }

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
            c.Address != null ? c.Address.Country : null,
            c.Scope, c.IsInbox, c.IsSystemManaged);

    /// <summary>
    /// Every user has one Personal Inbox — created on first use rather than by a
    /// migration, so new users need no extra setup step. A concurrent request creating
    /// the same Inbox loses to the unique index and is ignored.
    /// </summary>
    private async Task EnsureInboxesAsync(Guid familyId, Guid userId, CancellationToken cancellationToken)
    {
        var existing = await db.Collections
            .AnyAsync(c => c.FamilyId == familyId && c.IsInbox && c.OwnerUserId == userId, cancellationToken);
        if (existing) return;

        // API clients authenticate as themselves, not as a family member — they get no Personal Inbox.
        var isMember = await db.FamilyMembers.AnyAsync(m => m.FamilyId == familyId && m.LinkedUserId == userId, cancellationToken);
        if (!isMember) return;

        var now = DateTimeOffset.UtcNow;
        db.Collections.Add(new Domain.Entities.Collection
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            Name = "Inbox",
            Type = DomainCollectionType.TaskList,
            Color = "#9CA3AF",
            Scope = DomainScope.Personal,
            OwnerUserId = userId,
            IsInbox = true,
            CreatedAt = now,
            UpdatedAt = now,
            CreatedByUserId = userId,
        });

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Lost a race against another request creating the same Inbox — it exists now.
            db.ChangeTracker.Clear();
        }
    }

    public async Task<PagedResult<SectionResponse>> ListSectionsAsync(Guid familyId, Guid userId, Guid collectionId, PageRequest page, CancellationToken cancellationToken) =>
        await db.Sections
            .Where(s => s.CollectionId == collectionId && s.Collection.FamilyId == familyId
                && (s.Collection.Scope == DomainScope.Family || s.Collection.OwnerUserId == userId))
            .OrderBy(s => s.SortOrder).ThenBy(s => s.Name).ThenBy(s => s.Id)
            .Select(s => new SectionResponse(s.Id, s.CollectionId, s.Name, s.SortOrder))
            .ToPagedAsync(page, cancellationToken);

    public async Task<Result<SectionResponse>> CreateSectionAsync(Guid familyId, Guid userId, Guid collectionId, CreateSectionRequest request, CancellationToken cancellationToken)
    {
        var collection = await db.Collections.VisibleTo(userId)
            .FirstOrDefaultAsync(c => c.FamilyId == familyId && c.Id == collectionId, cancellationToken);
        if (collection is null) return Result<SectionResponse>.Failure(Error.NotFound());

        var name = request.Name.Trim();
        var existing = await db.Sections.FirstOrDefaultAsync(
            s => s.CollectionId == collectionId && s.Name.ToLower() == name.ToLower(), cancellationToken);
        if (existing is not null) return Result<SectionResponse>.Success(ToSectionResponse(existing));

        var nextOrder = await db.Sections.Where(s => s.CollectionId == collectionId).MaxAsync(s => (int?)s.SortOrder, cancellationToken) + 1 ?? 0;
        var section = new Domain.Entities.Section { Id = Guid.NewGuid(), CollectionId = collectionId, Name = name, SortOrder = nextOrder };
        db.Sections.Add(section);
        await db.SaveChangesAsync(cancellationToken);

        return Result<SectionResponse>.Success(ToSectionResponse(section));
    }

    public async Task<Result<SectionResponse>> UpdateSectionAsync(Guid familyId, Guid userId, Guid sectionId, UpdateSectionRequest request, CancellationToken cancellationToken)
    {
        var section = await FindSectionAsync(familyId, userId, sectionId, cancellationToken);
        if (section is null) return Result<SectionResponse>.Failure(Error.NotFound());

        section.Name = request.Name.Trim();
        section.SortOrder = request.SortOrder;
        await db.SaveChangesAsync(cancellationToken);

        return Result<SectionResponse>.Success(ToSectionResponse(section));
    }

    public async Task<Result> DeleteSectionAsync(Guid familyId, Guid userId, Guid sectionId, CancellationToken cancellationToken)
    {
        var section = await FindSectionAsync(familyId, userId, sectionId, cancellationToken);
        if (section is null) return Result.Failure(Error.NotFound());

        db.Sections.Remove(section);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private Task<Domain.Entities.Section?> FindSectionAsync(Guid familyId, Guid userId, Guid sectionId, CancellationToken cancellationToken) =>
        db.Sections.FirstOrDefaultAsync(
            s => s.Id == sectionId && s.Collection.FamilyId == familyId
                && (s.Collection.Scope == DomainScope.Family || s.Collection.OwnerUserId == userId),
            cancellationToken);

    private static SectionResponse ToSectionResponse(Domain.Entities.Section s) => new(s.Id, s.CollectionId, s.Name, s.SortOrder);
}
