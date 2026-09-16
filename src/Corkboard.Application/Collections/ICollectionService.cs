using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;

namespace Corkboard.Application.Collections;

public interface ICollectionService
{
    Task<IReadOnlyList<CollectionProjection>> ListAsync(Guid familyId, CollectionType? type, Guid? parentCollectionId, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> CreateAsync(Guid familyId, Guid userId, CreateCollectionRequest request, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> UpdateAsync(Guid familyId, Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken);

    /// <summary>(Re)generates the Collection's iCal feed token — invalidates any previously shared feed URL.</summary>
    Task<Result<CollectionProjection>> RotateFeedTokenAsync(Guid familyId, Guid id, CancellationToken cancellationToken);

    /// <summary>Deleting a Collection deletes the Nodes in it; blocked while it still has child Collections.</summary>
    Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken);
}
