using Corkboard.Application.Common;
using Corkboard.Api.Common;
using Corkboard.Application.ApiClients;
using Corkboard.Contracts.ApiClients;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>System-owner management of API clients — provisioning, revocation, and their 48h call log.</summary>
[ApiController]
[Route("api/admin/api-clients")]
public class AdminApiClientsController(IApiClientService apiClientService) : SystemOwnerControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ApiClientResponse>>> List([FromQuery] PageQuery paging, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        return this.PagedOk(await apiClientService.ListAsync(paging.ToRequest(), cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CreatedApiClientResponse>> Create(CreateApiClientRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.CreateAsync(CurrentUserId, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpGet("{id:guid}/call-log")]
    public async Task<ActionResult<IReadOnlyList<ApiCallLogEntryResponse>>> CallLog(Guid id, [FromQuery] PageQuery paging, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.GetCallLogAsync(id, paging.ToRequest(), cancellationToken);
        return result.IsSuccess ? this.PagedOk(result.Value) : result.Error!.ToActionResult<IReadOnlyList<ApiCallLogEntryResponse>>(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.RevokeAsync(id, cancellationToken);
        return result.ToActionResult(this);
    }
}
