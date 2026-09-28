namespace Corkboard.Domain.Entities;

/// <summary>
/// A Node placing a Recipe on a day of the family's MealPlan Collection.
/// Node.From is that day (date-only in practice, no time component used).
/// </summary>
public class Meal : Node
{
    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;

    /// <summary>
    /// How many people this occasion is planned for — defaults to the Recipe's own
    /// Servings client-side but is stored explicitly since it drives the ingredient
    /// scaling when adding this Meal to the shopping list.
    /// </summary>
    public int PlannedServings { get; set; }
}
