namespace Corkboard.Domain.Entities;

/// <summary>
/// Anything pinned to the family's board. Base of a TPH hierarchy — see
/// <see cref="Note"/>, <see cref="TaskNode"/>, <see cref="Appointment"/>.
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

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }

    public Guid CreatedByUserId { get; set; }

    public List<NodeAssignment> Assignments { get; set; } = [];
}
