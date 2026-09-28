using Corkboard.Application.Collections;
using Corkboard.Application.Common;
using Corkboard.Application.Nodes;
using Corkboard.Contracts.MealPlan;
using Corkboard.Contracts.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.MealPlan;

public class MealPlanService(CorkboardDbContext db, ICollectionService collections) : IMealPlanService
{
    public async Task<IReadOnlyList<NodeResponse>> GetWeekAsync(Guid familyId, Guid userId, DateOnly weekStart, CancellationToken cancellationToken)
    {
        var mealPlan = await collections.EnsureMealPlanCollectionAsync(familyId, userId, cancellationToken);

        var from = new DateTimeOffset(weekStart.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
        var until = from.AddDays(7);

        var meals = await db.Nodes
            .AsNoTracking()
            .Include(n => n.Assignments)
            .Include(n => ((Meal)n).Recipe)
            .Where(n => n.FamilyId == familyId && n.CollectionId == mealPlan.Id && n is Meal)
            .Where(n => n.From != null && n.From >= from && n.From < until)
            .OrderBy(n => n.From)
            .ToListAsync(cancellationToken);

        return meals.Select(NodeService.ToResponse).ToList();
    }

    public async Task<Result<AddToShoppingListResponse>> AddToShoppingListAsync(Guid familyId, Guid userId, Guid mealId, CancellationToken cancellationToken)
    {
        var meal = await db.Nodes.OfType<Meal>()
            .Include(m => m.Recipe).ThenInclude(r => r.Ingredients)
            .FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == mealId, cancellationToken);
        if (meal is null) return Result<AddToShoppingListResponse>.Failure(Error.NotFound());

        var shoppingList = await collections.EnsureShoppingListAsync(familyId, userId, cancellationToken);

        var existingItems = await db.Nodes.OfType<TaskNode>()
            .Where(t => t.CollectionId == shoppingList.Id && !t.IsCompleted)
            .ToListAsync(cancellationToken);

        var ratio = (decimal)meal.PlannedServings / meal.Recipe.Servings;
        var now = DateTimeOffset.UtcNow;
        int added = 0, merged = 0;

        foreach (var ingredient in meal.Recipe.Ingredients)
        {
            var scaledQuantity = ingredient.Quantity is { } quantity ? Math.Round(quantity * ratio, 2, MidpointRounding.AwayFromZero) : (decimal?)null;

            var existing = existingItems.FirstOrDefault(t => t.NormalizedName == ingredient.NormalizedName && t.Unit == ingredient.Unit);
            if (existing is not null)
            {
                if (scaledQuantity is { } add && existing.Quantity is { } current) existing.Quantity = current + add;
                existing.UpdatedAt = now;
                merged++;
                continue;
            }

            var item = new TaskNode
            {
                Id = Guid.NewGuid(),
                FamilyId = familyId,
                Title = ingredient.Name,
                CollectionId = shoppingList.Id,
                NormalizedName = ingredient.NormalizedName,
                Quantity = scaledQuantity,
                Unit = ingredient.Unit,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = userId,
            };
            db.Nodes.Add(item);
            existingItems.Add(item);
            added++;
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<AddToShoppingListResponse>.Success(new AddToShoppingListResponse(added, merged));
    }
}
