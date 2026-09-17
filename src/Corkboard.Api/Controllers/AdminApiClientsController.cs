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
    public async Task<ActionResult<IReadOnlyList<ApiClientResponse>>> List(CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        return Ok(await apiClientService.ListAsync(cancellationToken));
    }

    [HttpPost]
    public async Task<ActionResult<CreatedApiClientResponse>> Create(CreateApiClientRequest request, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.CreateAsync(CurrentUserId, request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpGet("{id:guid}/call-log")]
    public async Task<ActionResult<IReadOnlyList<ApiCallLogEntryResponse>>> CallLog(Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.GetCallLogAsync(id, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Revoke(Guid id, CancellationToken cancellationToken)
    {
        if (!CurrentUserIsSystemOwner) return SystemOwnerOnlyProblem();

        var result = await apiClientService.RevokeAsync(id, cancellationToken);
        return result.ToActionResult(this);
    }
}
