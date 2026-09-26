namespace Corkboard.Contracts.Collections;

public enum CollectionType
{
    TaskList,
    Calendar,
    Schedule,
    Household,
    RecipeBook,
    MealPlan,
}

/// <summary>Family lists are shared with the whole family; Personal lists are visible to their owner only.</summary>
public enum CollectionScope
{
    Family,
    Personal,
}
