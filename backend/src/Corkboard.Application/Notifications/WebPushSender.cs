using System.Net;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WebPush;
using DomainPushSubscription = Corkboard.Domain.Entities.PushSubscription;

namespace Corkboard.Application.Notifications;

/// <summary>Sends a payload to a browser's push service, signed with this server's VAPID key.</summary>
public class WebPushSender(IOptions<PushOptions> options, ILogger<WebPushSender> logger) : IPushSender, IDisposable
{
    private readonly WebPushClient _client = new();

    public async Task<PushResult> SendAsync(DomainPushSubscription subscription, string payloadJson, CancellationToken cancellationToken)
    {
        var push = options.Value;
        if (!push.Enabled) return PushResult.Failed;

        try
        {
            await _client.SendNotificationAsync(
                new WebPush.PushSubscription(subscription.Endpoint, subscription.P256dh, subscription.Auth),
                payloadJson,
                new VapidDetails(push.Subject, push.PublicKey, push.PrivateKey),
                cancellationToken);
            return PushResult.Sent;
        }
        catch (WebPushException ex) when (ex.StatusCode is HttpStatusCode.Gone or HttpStatusCode.NotFound)
        {
            return PushResult.Gone;
        }
        catch (Exception ex) when (ex is WebPushException or HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(ex, "Web Push to {Endpoint} failed", subscription.Endpoint);
            return PushResult.Failed;
        }
    }

    public void Dispose() => _client.Dispose();
}
