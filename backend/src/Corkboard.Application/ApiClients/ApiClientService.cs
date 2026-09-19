using System.Security.Cryptography;
using Corkboard.Application.Common;
using Corkboard.Contracts.ApiClients;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.ApiClients;

public class ApiClientService(CorkboardDbContext db) : IApiClientService
{
    private const int HashIterations = 100_000;
    private const int HashSizeBytes = 32;
    private const int SaltSizeBytes = 16;

    public async Task<IReadOnlyList<ApiClientResponse>> ListAsync(CancellationToken cancellationToken)
    {
        var clients = await db.ApiClients.AsNoTracking().OrderBy(c => c.Name).ToListAsync(cancellationToken);
        return clients.Select(ToResponse).ToList();
    }

    public async Task<Result<CreatedApiClientResponse>> CreateAsync(Guid createdByUserId, CreateApiClientRequest request, CancellationToken cancellationToken)
    {
        var unknownScopes = request.Scopes.Where(s => !ApiScopes.All.Contains(s)).ToList();
        if (unknownScopes.Count > 0)
        {
            return Result<CreatedApiClientResponse>.Failure(Error.BadRequest(
                "Unknown scope", $"Not a valid scope: {string.Join(", ", unknownScopes)}."));
        }

        var secret = GenerateSecret();
        var client = new ApiClient
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            ClientId = GenerateClientId(),
            ClientSecretHash = HashSecret(secret),
            Scopes = string.Join(' ', request.Scopes.Distinct()),
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = createdByUserId,
        };

        db.ApiClients.Add(client);
        await db.SaveChangesAsync(cancellationToken);

        return Result<CreatedApiClientResponse>.Success(new CreatedApiClientResponse(ToResponse(client), secret));
    }

    public async Task<Result> RevokeAsync(Guid id, CancellationToken cancellationToken)
    {
        var client = await db.ApiClients.FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        if (client is null) return Result.Failure(Error.NotFound());

        if (client.IsFirstParty)
        {
            return Result.Failure(Error.BadRequest(
                "Can't revoke the built-in client", "Corkboard Web's own login flow isn't managed here."));
        }

        client.IsRevoked = true;
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    public async Task<Result<IReadOnlyList<ApiCallLogEntryResponse>>> GetCallLogAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!await db.ApiClients.AnyAsync(c => c.Id == id, cancellationToken))
        {
            return Result<IReadOnlyList<ApiCallLogEntryResponse>>.Failure(Error.NotFound());
        }

        var cutoff = DateTimeOffset.UtcNow.AddHours(-48);
        var entries = await db.ApiCallLogs
            .Where(l => l.ApiClientId == id && l.Timestamp >= cutoff)
            .OrderByDescending(l => l.Timestamp)
            .Select(l => new ApiCallLogEntryResponse(l.Method, l.Path, l.StatusCode, l.DurationMs, l.Timestamp))
            .ToListAsync(cancellationToken);

        return Result<IReadOnlyList<ApiCallLogEntryResponse>>.Success(entries);
    }

    public async Task<ApiClient?> ValidateCredentialsAsync(string clientId, string clientSecret, CancellationToken cancellationToken)
    {
        var client = await db.ApiClients.FirstOrDefaultAsync(c => c.ClientId == clientId && !c.IsRevoked, cancellationToken);
        return client is not null && VerifySecret(clientSecret, client.ClientSecretHash) ? client : null;
    }

    private static string GenerateClientId() => Convert.ToHexString(RandomNumberGenerator.GetBytes(12)).ToLowerInvariant();

    private static string GenerateSecret() => Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));

    private static string HashSecret(string secret)
    {
        var salt = RandomNumberGenerator.GetBytes(SaltSizeBytes);
        var hash = Rfc2898DeriveBytes.Pbkdf2(secret, salt, HashIterations, HashAlgorithmName.SHA256, HashSizeBytes);
        return $"{HashIterations}.{Convert.ToBase64String(salt)}.{Convert.ToBase64String(hash)}";
    }

    private static bool VerifySecret(string secret, string storedHash)
    {
        var parts = storedHash.Split('.');
        if (parts.Length != 3 || !int.TryParse(parts[0], out var iterations)) return false;

        var salt = Convert.FromBase64String(parts[1]);
        var expectedHash = Convert.FromBase64String(parts[2]);
        var actualHash = Rfc2898DeriveBytes.Pbkdf2(secret, salt, iterations, HashAlgorithmName.SHA256, expectedHash.Length);

        return CryptographicOperations.FixedTimeEquals(actualHash, expectedHash);
    }

    private static ApiClientResponse ToResponse(ApiClient c) => new(
        c.Id, c.Name, c.ClientId, c.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries), c.IsRevoked, c.CreatedAt, c.LastUsedAt, c.IsFirstParty);
}
