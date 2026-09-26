using Corkboard.Application.Common;
using Corkboard.Contracts.MealPlan;
using Corkboard.Contracts.Nodes;

namespace Corkboard.Application.MealPlan;

public interface IMealPlanService
{
    /// <summary>The week's Meal Nodes (From in [weekStart, weekStart + 7 days)), each with its Recipe's title.</summary>
    Task<IReadOnlyList<NodeResponse>> GetWeekAsync(Guid familyId, Guid userId, DateOnly weekStart, CancellationToken cancellationToken);

    /// <summary>
    /// Scales the Meal's Recipe's ingredients by PlannedServings/Recipe.Servings and
    /// merges each into the Family's system shopping list, matching on
    /// (NormalizedName, Unit) against existing, not-yet-completed items.
    /// </summary>
    Task<Result<AddToShoppingListResponse>> AddToShoppingListAsync(Guid familyId, Guid userId, Guid mealId, CancellationToken cancellationToken);
}
