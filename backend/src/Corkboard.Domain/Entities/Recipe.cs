namespace Corkboard.Domain.Entities;

/// <summary>A Node holding a recipe: ingredients + steps, scaled from a base serving count.</summary>
public class Recipe : Node
{
    /// <summary>The base yield the Ingredients' quantities are written for.</summary>
    public int Servings { get; set; }

    /// <summary>Where the recipe came from, if anywhere (a website, say) — shown as a badge on the header.</summary>
    public string? SourceUrl { get; set; }

    public List<RecipeIngredient> Ingredients { get; set; } = [];
    public List<RecipeStep> Steps { get; set; } = [];

    /// <summary>At most one — the header image behind the title, editable only from the recipe's edit mode.</summary>
    public RecipePhoto? Photo { get; set; }
}
