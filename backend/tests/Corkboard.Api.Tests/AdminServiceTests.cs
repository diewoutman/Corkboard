using Corkboard.Application.Admin;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Tests;

public class AdminServiceTests
{
    private static CorkboardDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CorkboardDbContext(options);
    }

    private static Family AddFamily(CorkboardDbContext db, string name)
    {
        var family = new Family { Id = Guid.NewGuid(), Name = name, TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow };
        db.Families.Add(family);
        return family;
    }

    [Fact]
    public async Task GetStatsAsync_counts_families_members_and_nodes_and_excludes_the_first_party_client()
    {
        await using var db = CreateDb();
        var family = AddFamily(db, "Test Family");
        db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), FamilyId = family.Id, DisplayName = "Kid", Color = "#fff" });
        db.Notes.Add(new Note { Id = Guid.NewGuid(), FamilyId = family.Id, Title = "A note", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        db.ApiClients.Add(new ApiClient { Id = Guid.NewGuid(), Name = "Corkboard Web", ClientId = "corkboard-web", ClientSecretHash = "", Scopes = "", IsFirstParty = true, CreatedAt = DateTimeOffset.UtcNow, CreatedByUserId = Guid.Empty });
        db.ApiClients.Add(new ApiClient { Id = Guid.NewGuid(), Name = "Automation", ClientId = "automation", ClientSecretHash = "", Scopes = "nodes:read", CreatedAt = DateTimeOffset.UtcNow, CreatedByUserId = Guid.Empty });
        await db.SaveChangesAsync();

        var service = new AdminService(db);
        var stats = await service.GetStatsAsync(CancellationToken.None);

        Assert.Equal(1, stats.FamilyCount);
        Assert.Equal(1, stats.FamilyMemberCount);
        Assert.Equal(1, stats.NodeCount);
        Assert.Equal(1, stats.ApiClientCount);
        Assert.Equal(1, stats.ActiveApiClientCount);
    }

    [Fact]
    public async Task ListFamiliesAsync_returns_every_family_with_its_member_and_node_counts()
    {
        await using var db = CreateDb();
        var familyA = AddFamily(db, "A Family");
        var familyB = AddFamily(db, "B Family");
        db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), FamilyId = familyA.Id, DisplayName = "Member", Color = "#fff" });
        db.Notes.Add(new Note { Id = Guid.NewGuid(), FamilyId = familyB.Id, Title = "Note", CreatedAt = DateTimeOffset.UtcNow, UpdatedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync();

        var service = new AdminService(db);
        var families = (await service.ListFamiliesAsync(Corkboard.Application.Common.PageRequest.Default, CancellationToken.None)).Items;

        Assert.Equal(2, families.Count);
        var a = Assert.Single(families, f => f.Id == familyA.Id);
        Assert.Equal(1, a.MemberCount);
        Assert.Equal(0, a.NodeCount);
        var b = Assert.Single(families, f => f.Id == familyB.Id);
        Assert.Equal(0, b.MemberCount);
        Assert.Equal(1, b.NodeCount);
    }
}
