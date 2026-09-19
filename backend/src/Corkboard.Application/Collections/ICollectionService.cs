using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;

namespace Corkboard.Application.Collections;

public interface ICollectionService
{
    Task<IReadOnlyList<CollectionProjection>> ListAsync(Guid familyId, Guid userId, CollectionType? type, Guid? parentCollectionId, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> GetAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> CreateAsync(Guid familyId, Guid userId, CreateCollectionRequest request, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken);

    /// <summary>(Re)generates the Collection's iCal feed token — invalidates any previously shared feed URL.</summary>
    Task<Result<CollectionProjection>> RotateFeedTokenAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    /// <summary>Deleting a Collection deletes the Nodes in it; blocked while it still has child Collections.</summary>
    Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<SectionResponse>> ListSectionsAsync(Guid familyId, Guid userId, Guid collectionId, CancellationToken cancellationToken);

    Task<Result<SectionResponse>> CreateSectionAsync(Guid familyId, Guid userId, Guid collectionId, CreateSectionRequest request, CancellationToken cancellationToken);

    Task<Result<SectionResponse>> UpdateSectionAsync(Guid familyId, Guid userId, Guid sectionId, UpdateSectionRequest request, CancellationToken cancellationToken);

    /// <summary>Deleting a Section keeps its Tasks; they just lose their section.</summary>
    Task<Result> DeleteSectionAsync(Guid familyId, Guid userId, Guid sectionId, CancellationToken cancellationToken);
}
