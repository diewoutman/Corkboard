using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Application.ApiClients;
using Corkboard.Contracts.ApiClients;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace Corkboard.Api.Controllers;

/// <summary>
/// Anonymous — a client can't do an interactive JWT login, so it authenticates
/// with its clientId/clientSecret here to get a short-lived scoped token instead
/// (see TokenService.CreateClientTokenAsync). Kept out of AdminApiClientsController
/// (which is [Authorize], system-owner-only, and lives under /api/admin) so this
/// one endpoint — called by the external client itself, not the admin — keeps its
/// own stable, non-admin URL.
/// </summary>
[ApiController]
[AllowAnonymous]
[Route("api/api-clients")]
[EnableRateLimiting(RateLimiterPolicies.Auth)]
public class ApiClientTokenController(IApiClientService apiClientService, ITokenService tokenService) : ControllerBase
{
    [HttpPost("token")]
    public async Task<ActionResult<ApiClientTokenResponse>> Token(ApiClientTokenRequest request, CancellationToken cancellationToken)
    {
        var client = await apiClientService.ValidateCredentialsAsync(request.ClientId, request.ClientSecret, cancellationToken);
        if (client is null)
        {
            return Problem(title: "Invalid client credentials", statusCode: StatusCodes.Status401Unauthorized);
        }

        return Ok(await tokenService.CreateClientTokenAsync(client, cancellationToken));
    }
}
