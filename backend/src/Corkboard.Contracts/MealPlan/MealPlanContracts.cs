namespace Corkboard.Contracts.MealPlan;

/// <summary>
/// Result of POST /api/meal-plan/{mealId}/add-to-shopping-list — a toast-friendly
/// summary rather than the full shopping list (the caller already has a shopping
/// list view for that).
/// </summary>
public record AddToShoppingListResponse(int ItemsAdded, int ItemsMerged);
