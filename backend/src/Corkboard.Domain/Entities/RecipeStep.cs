namespace Corkboard.Domain.Entities;

/// <summary>One numbered instruction on a Recipe, ordered by SortOrder.</summary>
public class RecipeStep
{
    public Guid Id { get; set; }

    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;

    public required string Instruction { get; set; }
    public int SortOrder { get; set; }
}
