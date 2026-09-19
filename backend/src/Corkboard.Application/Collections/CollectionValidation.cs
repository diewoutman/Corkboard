using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Collections;

/// <summary>
/// Shared "does this optional CollectionId belong to this Family" check — used by
/// every service that accepts a CollectionId on a request (Nodes, Dashboard widgets,
/// a Collection's own ParentCollectionId, …). A null id is vacuously valid (nothing
/// to attach to).
/// </summary>
public static class CollectionValidation
{
    public static Task<bool> ExistsAsync(CorkboardDbContext db, Guid familyId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (collectionId is not { } id) return Task.FromResult(true);
        return db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
    }
}
