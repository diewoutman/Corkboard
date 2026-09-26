using Corkboard.Application.Collections;
using Corkboard.Application.MealPlan;
using Corkboard.Application.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using CollectionType = Corkboard.Domain.Entities.CollectionType;
using CollectionScope = Corkboard.Domain.Entities.CollectionScope;

namespace Corkboard.Api.Tests;

public class MealPlanServiceTests
{
    private readonly Guid _familyId = Guid.NewGuid();
    private readonly Guid _anna = Guid.NewGuid();

    private (CorkboardDbContext Db, MealPlanService Service, Collection MealPlan) Seed()
    {
        var db = new CorkboardDbContext(new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Families.Add(new Family { Id = _familyId, Name = "Test", TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow });

        var mealPlan = new Collection { Id = Guid.NewGuid(), FamilyId = _familyId, Name = "Maaltijdplanner", Type = CollectionType.MealPlan, Color = "#F97316", Scope = CollectionScope.Family, CreatedByUserId = _anna };
        db.Collections.Add(mealPlan);
        db.SaveChanges();

        return (db, new MealPlanService(db, new CollectionService(db)), mealPlan);
    }

    private static Recipe MakeRecipe(Guid familyId, Guid userId, int servings, params (string Name, decimal? Quantity, IngredientUnit? Unit)[] ingredients)
    {
        var recipe = new Recipe
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            Title = "Soup",
            Servings = servings,
            CreatedByUserId = userId,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };
        recipe.Ingredients = ingredients.Select((ing, i) => new RecipeIngredient
        {
            Id = Guid.NewGuid(),
            RecipeId = recipe.Id,
            Name = ing.Name,
            NormalizedName = NodeService.Normalize(ing.Name),
            Quantity = ing.Quantity,
            Unit = ing.Unit,
            SortOrder = i,
        }).ToList();
        return recipe;
    }

    private Meal MakeMeal(Recipe recipe, Guid mealPlanId, DateTimeOffset day, int plannedServings) => new()
    {
        Id = Guid.NewGuid(),
        FamilyId = _familyId,
        Title = recipe.Title,
        RecipeId = recipe.Id,
        Recipe = recipe,
        PlannedServings = plannedServings,
        CollectionId = mealPlanId,
        From = day,
        CreatedByUserId = _anna,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow,
    };

    [Fact]
    public async Task GetWeekAsync_returns_only_meals_inside_the_requested_week()
    {
        var (db, service, mealPlan) = Seed();
        await using var _ = db;

        var recipe = MakeRecipe(_familyId, _anna, 4, ("Flour", 200m, IngredientUnit.Gram));
        db.Nodes.Add(recipe);

        var weekStart = new DateOnly(2026, 9, 21); // a Monday
        var monday = new DateTimeOffset(weekStart.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        db.Nodes.Add(MakeMeal(recipe, mealPlan.Id, monday, 4));
        db.Nodes.Add(MakeMeal(recipe, mealPlan.Id, monday.AddDays(6), 4)); // Sunday, still inside the week
        db.Nodes.Add(MakeMeal(recipe, mealPlan.Id, monday.AddDays(7), 4)); // next Monday, outside
        db.Nodes.Add(MakeMeal(recipe, mealPlan.Id, monday.AddDays(-1), 4)); // previous Sunday, outside
        await db.SaveChangesAsync();

        var week = await service.GetWeekAsync(_familyId, _anna, weekStart, CancellationToken.None);

        Assert.Equal(2, week.Count);
        Assert.All(week, m => Assert.Equal("Soup", m.RecipeTitle));
    }

    [Fact]
    public async Task AddToShoppingListAsync_scales_quantities_by_the_planned_servings_ratio()
    {
        var (db, service, mealPlan) = Seed();
        await using var _ = db;

        var recipe = MakeRecipe(_familyId, _anna, 4, ("Flour", 200m, IngredientUnit.Gram));
        db.Nodes.Add(recipe);
        var meal = MakeMeal(recipe, mealPlan.Id, DateTimeOffset.UtcNow, plannedServings: 2); // half the base servings
        db.Nodes.Add(meal);
        await db.SaveChangesAsync();

        var result = await service.AddToShoppingListAsync(_familyId, _anna, meal.Id, CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(1, result.Value!.ItemsAdded);
        Assert.Equal(0, result.Value.ItemsMerged);

        var item = Assert.Single(db.Nodes.OfType<TaskNode>());
        Assert.Equal("Flour", item.Title);
        Assert.Equal(100m, item.Quantity);
        Assert.Equal(IngredientUnit.Gram, item.Unit);
    }

    [Fact]
    public async Task AddToShoppingListAsync_merges_into_an_existing_line_by_normalized_name_and_unit()
    {
        var (db, service, mealPlan) = Seed();
        await using var _ = db;

        var recipe1 = MakeRecipe(_familyId, _anna, 4, ("Ui", 2m, IngredientUnit.Piece));
        var recipe2 = MakeRecipe(_familyId, _anna, 2, ("UI", 1m, IngredientUnit.Piece)); // same ingredient, different casing
        db.Nodes.AddRange(recipe1, recipe2);
        var meal1 = MakeMeal(recipe1, mealPlan.Id, DateTimeOffset.UtcNow, plannedServings: 4);
        var meal2 = MakeMeal(recipe2, mealPlan.Id, DateTimeOffset.UtcNow.AddDays(1), plannedServings: 2);
        db.Nodes.AddRange(meal1, meal2);
        await db.SaveChangesAsync();

        var first = await service.AddToShoppingListAsync(_familyId, _anna, meal1.Id, CancellationToken.None);
        var second = await service.AddToShoppingListAsync(_familyId, _anna, meal2.Id, CancellationToken.None);

        Assert.Equal(1, first.Value!.ItemsAdded);
        Assert.Equal(1, second.Value!.ItemsMerged);

        var item = Assert.Single(db.Nodes.OfType<TaskNode>());
        Assert.Equal(3m, item.Quantity); // 2 (recipe1 @ 4/4 servings) + 1 (recipe2 @ 2/2 servings)
    }

    [Fact]
    public async Task AddToShoppingListAsync_fails_for_a_meal_outside_the_family()
    {
        var (db, service, _) = Seed();
        await using var _2 = db;

        var result = await service.AddToShoppingListAsync(_familyId, _anna, Guid.NewGuid(), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }
}
