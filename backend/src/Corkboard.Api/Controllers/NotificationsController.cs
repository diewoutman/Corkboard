using Corkboard.Api.Common;
using Corkboard.Application.Notifications;
using Corkboard.Contracts.Notifications;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>The signed-in person's Web Push devices. Not available to API clients — there is no human to notify.</summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController(NotificationService notifications) : ControllerBase
{
    [HttpGet("config")]
    public ActionResult<PushConfigResponse> GetConfig() => Ok(notifications.GetConfig());

    [HttpGet("subscriptions")]
    public async Task<ActionResult<IReadOnlyList<PushSubscriptionResponse>>> List(CancellationToken cancellationToken)
    {
        if (User.IsScopedClient()) return ClientForbidden();
        return Ok(await notifications.ListAsync(User.GetUserId(), cancellationToken));
    }

    /// <summary>Registers (or updates) this device. Called after the browser granted permission.</summary>
    [HttpPut("subscriptions")]
    public async Task<ActionResult<PushSubscriptionResponse>> Subscribe(SubscribePushRequest request, CancellationToken cancellationToken)
    {
        if (User.IsScopedClient()) return ClientForbidden();
        var result = await notifications.SubscribeAsync(User.GetUserId(), request, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpDelete("subscriptions")]
    public async Task<IActionResult> Unsubscribe([FromQuery] string endpoint, CancellationToken cancellationToken)
    {
        if (User.IsScopedClient()) return ClientForbidden();
        var result = await notifications.UnsubscribeAsync(User.GetUserId(), endpoint, cancellationToken);
        return result.ToActionResult(this);
    }

    private ObjectResult ClientForbidden() => Problem(
        title: "Not available to API clients",
        detail: "Notifications are a per-user setting.",
        statusCode: StatusCodes.Status403Forbidden);
}
