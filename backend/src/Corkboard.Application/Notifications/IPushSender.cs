using Corkboard.Domain.Entities;

namespace Corkboard.Application.Notifications;

public enum PushResult
{
    Sent,
    /// <summary>The push service says this subscription no longer exists (404/410) — delete it.</summary>
    Gone,
    /// <summary>A transient failure; try again on the next run.</summary>
    Failed,
}

public interface IPushSender
{
    Task<PushResult> SendAsync(PushSubscription subscription, string payloadJson, CancellationToken cancellationToken);
}
