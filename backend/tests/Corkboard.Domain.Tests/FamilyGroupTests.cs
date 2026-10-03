using Corkboard.Domain.Entities;

namespace Corkboard.Domain.Tests;

public class FamilyGroupTests
{
    [Fact]
    public void Membership_connects_a_group_to_a_family_member()
    {
        var family = new Family { Id = Guid.NewGuid(), Name = "The Smiths", TimeZone = "Europe/Amsterdam" };
        var group = new FamilyGroup { Id = Guid.NewGuid(), FamilyId = family.Id, Family = family, Name = "Kids" };
        var member = new FamilyMember { Id = Guid.NewGuid(), FamilyId = family.Id, Family = family, DisplayName = "Sam", Color = "#ff0000" };
        var membership = new FamilyGroupMembership { FamilyGroup = group, FamilyGroupId = group.Id, FamilyMember = member, FamilyMemberId = member.Id };

        group.Memberships.Add(membership);
        member.GroupMemberships.Add(membership);

        Assert.Equal(member.Id, group.Memberships.Single().FamilyMemberId);
        Assert.Same(group, member.GroupMemberships.Single().FamilyGroup);
    }
}
