using Corkboard.Api.Common;
using Corkboard.Application.Dashboard;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Dashboard;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/dashboard")]
[RequireScope(ApiScopes.Dashboard)]
public class DashboardController(IDashboardService dashboardService) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<DashboardWidgetResponse>>> List([FromQuery] DashboardWidgetScope scope, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        return Ok(await dashboardService.ListAsync(familyId, CurrentUserId, scope, cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<DashboardWidgetResponse>> Create(CreateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await dashboardService.CreateAsync(familyId, CurrentUserId, CurrentUserIsAdmin, request, cancellationToken);
        return result.ToCreatedActionResult(this, nameof(List), _ => new { });
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<DashboardWidgetResponse>> Update(Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await dashboardService.UpdateAsync(familyId, CurrentUserId, CurrentUserIsAdmin, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPut("{id:guid}/span")]
    public async Task<ActionResult<DashboardWidgetResponse>> UpdateSpan(Guid id, UpdateDashboardWidgetSpanRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await dashboardService.UpdateSpanAsync(familyId, CurrentUserId, CurrentUserIsAdmin, id, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPut("reorder")]
    public async Task<ActionResult<IReadOnlyList<DashboardWidgetResponse>>> Reorder([FromQuery] DashboardWidgetScope scope, ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await dashboardService.ReorderAsync(familyId, CurrentUserId, scope, CurrentUserIsAdmin, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await dashboardService.DeleteAsync(familyId, CurrentUserId, CurrentUserIsAdmin, id, cancellationToken);
        return result.ToActionResult(this);
    }
}
