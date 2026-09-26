namespace Corkboard.Domain.Entities;

/// <summary>
/// One ingredient line on a Recipe. <see cref="NormalizedName"/> is computed
/// server-side (trim/lowercase/strip diacritics/collapse whitespace) from
/// <see cref="Name"/> and never client-set — it's the matching key used to merge
/// this ingredient into an existing shopping-list line (see MealPlanService).
/// </summary>
public class RecipeIngredient
{
    public Guid Id { get; set; }

    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;

    public required string Name { get; set; }
    public required string NormalizedName { get; set; }

    /// <summary>Null for a to-taste ingredient with no fixed amount.</summary>
    public decimal? Quantity { get; set; }
    public IngredientUnit? Unit { get; set; }

    public int SortOrder { get; set; }
}
