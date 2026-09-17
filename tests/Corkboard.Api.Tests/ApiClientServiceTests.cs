using Corkboard.Application.ApiClients;
using Corkboard.Contracts.ApiClients;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Tests;

public class ApiClientServiceTests
{
    private static CorkboardDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new CorkboardDbContext(options);
    }

    [Fact]
    public async Task CreateAsync_then_ValidateCredentialsAsync_round_trips_the_generated_secret()
    {
        await using var db = CreateDb();
        var service = new ApiClientService(db);

        var created = await service.CreateAsync(
            Guid.NewGuid(),
            new CreateApiClientRequest("Test client", [ApiScopes.Read(ApiScopes.Nodes)]),
            CancellationToken.None);

        Assert.True(created.IsSuccess);

        var validated = await service.ValidateCredentialsAsync(
            created.Value.Client.ClientId, created.Value.ClientSecret, CancellationToken.None);

        Assert.NotNull(validated);
        Assert.Equal(created.Value.Client.Id, validated!.Id);
    }

    [Fact]
    public async Task ValidateCredentialsAsync_rejects_a_wrong_secret()
    {
        await using var db = CreateDb();
        var service = new ApiClientService(db);

        var created = await service.CreateAsync(
            Guid.NewGuid(), new CreateApiClientRequest("Test client", []), CancellationToken.None);

        var validated = await service.ValidateCredentialsAsync(created.Value.Client.ClientId, "wrong-secret", CancellationToken.None);

        Assert.Null(validated);
    }

    [Fact]
    public async Task CreateAsync_rejects_an_unknown_scope()
    {
        await using var db = CreateDb();
        var service = new ApiClientService(db);

        var result = await service.CreateAsync(
            Guid.NewGuid(), new CreateApiClientRequest("Test client", ["not-a-real-scope"]), CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.Error!.StatusCode);
    }

    [Fact]
    public async Task RevokeAsync_refuses_to_revoke_the_first_party_GUI_client()
    {
        await using var db = CreateDb();
        var firstParty = new ApiClient
        {
            Id = Guid.NewGuid(),
            Name = "Corkboard Web",
            ClientId = "corkboard-web",
            ClientSecretHash = string.Empty,
            Scopes = string.Empty,
            IsFirstParty = true,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = Guid.Empty,
        };
        db.ApiClients.Add(firstParty);
        await db.SaveChangesAsync();

        var service = new ApiClientService(db);
        var result = await service.RevokeAsync(firstParty.Id, CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.Equal(400, result.Error!.StatusCode);
    }

    [Fact]
    public async Task RevokeAsync_makes_ValidateCredentialsAsync_fail_even_with_the_right_secret()
    {
        await using var db = CreateDb();
        var service = new ApiClientService(db);

        var created = await service.CreateAsync(
            Guid.NewGuid(), new CreateApiClientRequest("Test client", []), CancellationToken.None);

        var revoked = await service.RevokeAsync(created.Value.Client.Id, CancellationToken.None);
        Assert.True(revoked.IsSuccess);

        var validated = await service.ValidateCredentialsAsync(
            created.Value.Client.ClientId, created.Value.ClientSecret, CancellationToken.None);

        Assert.Null(validated);
    }
}
