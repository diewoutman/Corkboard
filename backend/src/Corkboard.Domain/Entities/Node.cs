namespace Corkboard.Domain.Entities;

/// <summary>
/// Anything a family member creates for the family to track. Base of a TPH
/// hierarchy — see <see cref="Note"/>, <see cref="TaskNode"/>, <see cref="Appointment"/>.
/// </summary>
public abstract class Node
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public required string Title { get; set; }
    public string? Description { get; set; }

    /// <summary>Start / effective date. Optional — a plain note may have neither From nor Until.</summary>
    public DateTimeOffset? From { get; set; }

    /// <summary>End / due date.</summary>
    public DateTimeOffset? Until { get; set; }

    /// <summary>
    /// Optional containing Collection (e.g. the Task list this Task belongs to).
    /// Null for a Node that isn't grouped into anything.
    /// </summary>
    public Guid? CollectionId { get; set; }
    public Collection? Collection { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Guid CreatedByUserId { get; set; }

    public List<NodeAssignment> Assignments { get; set; } = [];
}
