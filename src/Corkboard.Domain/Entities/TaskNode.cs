namespace Corkboard.Domain.Entities;

/// <summary>Named TaskNode (not Task) to avoid colliding with System.Threading.Tasks.Task.</summary>
public class TaskNode : Node
{
    public bool IsCompleted { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? Priority { get; set; }
}
