using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Collections;

/// <summary>
/// Shared "does this optional CollectionId belong to this Family" check — used by
/// every service that accepts a CollectionId on a request (Nodes, Dashboard widgets,
/// a Collection's own ParentCollectionId, …). A null id is vacuously valid (nothing
/// to attach to). Personal Collections only count for their owner.
/// </summary>
public static class CollectionValidation
{
    /// <summary>Restricts a query to the Collections <paramref name="userId"/> may see: every Family one, plus their own Personal ones.</summary>
    public static IQueryable<Collection> VisibleTo(this IQueryable<Collection> query, Guid userId) =>
        query.Where(c => c.Scope == CollectionScope.Family || c.OwnerUserId == userId);

    public static Task<bool> ExistsAsync(CorkboardDbContext db, Guid familyId, Guid userId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (collectionId is not { } id) return Task.FromResult(true);
        return db.Collections.VisibleTo(userId).AnyAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
    }

    /// <summary>For shared things (dashboard widgets) that must never point at somebody's Personal list.</summary>
    public static Task<bool> SharedExistsAsync(CorkboardDbContext db, Guid familyId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (collectionId is not { } id) return Task.FromResult(true);
        return db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == id && c.Scope == CollectionScope.Family, cancellationToken);
    }
}
