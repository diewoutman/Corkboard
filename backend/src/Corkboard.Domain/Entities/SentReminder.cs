namespace Corkboard.Domain.Entities;

/// <summary>
/// Records that a device already got the reminder for one occurrence of a task or
/// appointment, so restarts, rescheduling or overlapping runs never notify twice.
/// Keyed by the occurrence's start (not just the node) so a recurring item reminds
/// once per occurrence.
/// </summary>
public class SentReminder
{
    public Guid PushSubscriptionId { get; set; }
    public PushSubscription PushSubscription { get; set; } = null!;

    public Guid NodeId { get; set; }
    public Node Node { get; set; } = null!;

    public DateTimeOffset OccurrenceStart { get; set; }
    public DateTimeOffset SentAt { get; set; }
}
