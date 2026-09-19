using Corkboard.Api.Common;
using Corkboard.Application.Admin;
using Corkboard.Application.Families;
using Corkboard.Contracts.Admin;
using Corkboard.Contracts.Families;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>System-owner-only instance stats and cross-family Family admin — see CONCEPT.md's Admin console section.</summary>
[ApiController]
[Route("api/admin")]
public class AdminController(IAdminService adminService, IFamilyService familyService) : SystemOwnerControllerBase
{
    [HttpGet("stats")]
    public async Task<ActionResult<AdminStatsResponse>> Stats(CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        return Ok(await adminService.GetStatsAsync(cancellationToken));
    }

    [HttpGet("families")]
    public async Task<ActionResult<IReadOnlyList<AdminFamilySummaryResponse>>> Families([FromQuery] PageQuery paging, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        return this.PagedOk(await adminService.ListFamiliesAsync(paging.ToRequest(), cancellationToken));
    }

    [HttpGet("families/{id:guid}")]
    public async Task<ActionResult<FamilyResponse>> Family(Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyService.GetMineAsync(id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpPut("families/{id:guid}")]
    public async Task<ActionResult<FamilyResponse>> UpdateFamily(Guid id, UpdateFamilyRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await familyService.UpdateAsync(id, request, cancellationToken);
        return result.ToActionResult(this);
    }
}
