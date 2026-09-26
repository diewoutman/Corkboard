using Corkboard.Api.Common;
using Corkboard.Application.MealPlan;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.MealPlan;
using Corkboard.Contracts.Nodes;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>
/// A thin, specialized layer over the generic Node CRUD — same shape as
/// CalendarController — for the meal-plan week query and the "add these
/// ingredients to the shopping list" action. Meal/Recipe Nodes are otherwise
/// created/edited/deleted through NodesController like every other Node type.
/// </summary>
[ApiController]
[Route("api/meal-plan")]
[RequireScope(ApiScopes.MealPlan)]
public class MealPlanController(IMealPlanService mealPlanService) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NodeResponse>>> Week([FromQuery] DateOnly weekStart, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        return Ok(await mealPlanService.GetWeekAsync(familyId, CurrentUserId, weekStart, cancellationToken));
    }

    [HttpPost("{mealId:guid}/add-to-shopping-list")]
    public async Task<ActionResult<AddToShoppingListResponse>> AddToShoppingList(Guid mealId, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await mealPlanService.AddToShoppingListAsync(familyId, CurrentUserId, mealId, cancellationToken);
        return result.ToActionResult(this);
    }
}
