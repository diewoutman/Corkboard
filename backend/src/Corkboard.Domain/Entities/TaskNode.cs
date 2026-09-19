namespace Corkboard.Domain.Entities;

/// <summary>Named TaskNode (not Task) to avoid colliding with System.Threading.Tasks.Task.</summary>
public class TaskNode : Node
{
    public bool IsCompleted { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? Priority { get; set; }

    /// <summary>Optional Section (Todoist-style category) within the Task's Collection.</summary>
    public Guid? SectionId { get; set; }
    public Section? Section { get; set; }

    /// <summary>
    /// Same RRULE format and column as Appointment.RecurrenceRule (TPH siblings
    /// sharing one "RecurrenceRule" column — only one of the two types applies
    /// per row, per NodeType). Unlike Appointment, a Task isn't expanded into
    /// multiple occurrences: completing a recurring Task just rolls Until
    /// forward to the next occurrence instead of completing it — see
    /// NodesController.Update.
    /// </summary>
    public string? RecurrenceRule { get; set; }
}
