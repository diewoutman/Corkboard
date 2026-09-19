namespace Corkboard.Domain.Entities;

/// <summary>Join entity: many FamilyMembers can be assigned to one Node, and vice versa.</summary>
public class NodeAssignment
{
    public Guid NodeId { get; set; }
    public Node Node { get; set; } = null!;

    public Guid FamilyMemberId { get; set; }
    public FamilyMember FamilyMember { get; set; } = null!;
}
