using Corkboard.Application.Families;
using Corkboard.Contracts.Families;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Tests;

public class FamilyServiceTests
{
    private static CorkboardDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CorkboardDbContext(options);
    }

    [Fact]
    public async Task UpdateAsync_renames_the_family_and_changes_its_time_zone()
    {
        await using var db = CreateDb();
        var family = new Family { Id = Guid.NewGuid(), Name = "Old name", TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow };
        db.Families.Add(family);
        await db.SaveChangesAsync();

        var service = new FamilyService(db);
        var result = await service.UpdateAsync(family.Id, new UpdateFamilyRequest("New name", "America/New_York"), CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal("New name", result.Value.Name);
        Assert.Equal("America/New_York", result.Value.TimeZone);
    }

    [Fact]
    public async Task UpdateAsync_returns_not_found_for_an_unknown_family()
    {
        await using var db = CreateDb();
        var service = new FamilyService(db);

        var result = await service.UpdateAsync(Guid.NewGuid(), new UpdateFamilyRequest("Name", "Europe/Amsterdam"), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(404, result.Error!.StatusCode);
    }
}
