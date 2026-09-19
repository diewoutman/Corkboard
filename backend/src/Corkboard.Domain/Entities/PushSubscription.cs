namespace Corkboard.Domain.Entities;

/// <summary>
/// One browser/device that opted in to Web Push reminders. A user can have several
/// (phone, laptop…), each with its own lead time — "notifications on/off per device"
/// is simply whether that device has a row here.
/// </summary>
public class PushSubscription
{
    public Guid Id { get; set; }

    /// <summary>The Identity user who subscribed; bare Guid for the same reason as <see cref="UserFamily.UserId"/>.</summary>
    public Guid UserId { get; set; }

    /// <summary>The push service URL the browser handed out — unique per browser install.</summary>
    public required string Endpoint { get; set; }
    public required string P256dh { get; set; }
    public required string Auth { get; set; }

    public string? UserAgent { get; set; }

    /// <summary>Remind this many minutes before a task/appointment starts. 0 = at the time itself.</summary>
    public int LeadMinutes { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset LastSeenAt { get; set; }
}
