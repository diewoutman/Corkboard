using Corkboard.Api.Common;
using Corkboard.Application.Activity;
using Corkboard.Contracts.Activity;
using Corkboard.Contracts.ApiClients;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/activity")]
[RequireScope(ApiScopes.Family)]
public class ActivityController(IActivityService activityService) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ActivityResponse>>> List([FromQuery] PageQuery paging, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();
        return this.PagedOk(await activityService.ListAsync(familyId, paging.ToRequest(), cancellationToken));
    }
}
