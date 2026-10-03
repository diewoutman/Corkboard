namespace Corkboard.Domain.Entities;

/// <summary>A named collection of members within a family, such as Adults or Kids.</summary>
public class FamilyGroup
{
    public Guid Id { get; set; }
    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;
    public required string Name { get; set; }
    public string? Color { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public List<FamilyGroupMembership> Memberships { get; set; } = [];
}

public class FamilyGroupMembership
{
    public Guid FamilyGroupId { get; set; }
    public FamilyGroup FamilyGroup { get; set; } = null!;
    public Guid FamilyMemberId { get; set; }
    public FamilyMember FamilyMember { get; set; } = null!;
}
