namespace Corkboard.Domain.Entities;

/// <summary>
/// A fixed set of units so two ingredients can be recognized as "the same thing" and
/// merged when their quantities land on the shopping list (see RecipeIngredient.Unit,
/// TaskNode.Unit) — a free-text unit would make that matching unreliable.
/// </summary>
public enum IngredientUnit
{
    Gram,
    Kilogram,
    Milliliter,
    Liter,
    Piece,
    Teaspoon,
    Tablespoon,
    Pinch,
    Clove,
    Slice,
    Can,
    Package,
    Bunch,
    ToTaste,
}
