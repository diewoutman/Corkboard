using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;

namespace Corkboard.Application.Collections;

public interface ICollectionService
{
    /// <param name="allLevels">Ignores <paramref name="parentCollectionId"/> and returns every matching Collection regardless of nesting — for rendering a whole tree at once (e.g. Recipes' folder sidebar).</param>
    Task<PagedResult<CollectionProjection>> ListAsync(Guid familyId, Guid userId, CollectionType? type, Guid? parentCollectionId, bool allLevels, PageRequest page, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> GetAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> CreateAsync(Guid familyId, Guid userId, CreateCollectionRequest request, CancellationToken cancellationToken);

    /// <summary>The Family's one system-managed shopping-list TaskList — created on first request.</summary>
    Task<CollectionProjection> EnsureShoppingListAsync(Guid familyId, Guid userId, CancellationToken cancellationToken);

    /// <summary>The Family's one MealPlan collection — created on first request.</summary>
    Task<CollectionProjection> EnsureMealPlanCollectionAsync(Guid familyId, Guid userId, CancellationToken cancellationToken);

    Task<Result<CollectionProjection>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateCollectionRequest request, CancellationToken cancellationToken);

    /// <summary>(Re)generates the Collection's iCal feed token — invalidates any previously shared feed URL.</summary>
    Task<Result<CollectionProjection>> RotateFeedTokenAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    /// <summary>Deleting a Collection deletes the Nodes in it; blocked while it still has child Collections.</summary>
    Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);

    Task<PagedResult<SectionResponse>> ListSectionsAsync(Guid familyId, Guid userId, Guid collectionId, PageRequest page, CancellationToken cancellationToken);

    Task<Result<SectionResponse>> CreateSectionAsync(Guid familyId, Guid userId, Guid collectionId, CreateSectionRequest request, CancellationToken cancellationToken);

    Task<Result<SectionResponse>> UpdateSectionAsync(Guid familyId, Guid userId, Guid sectionId, UpdateSectionRequest request, CancellationToken cancellationToken);

    /// <summary>Deleting a Section keeps its Tasks; they just lose their section.</summary>
    Task<Result> DeleteSectionAsync(Guid familyId, Guid userId, Guid sectionId, CancellationToken cancellationToken);
}
