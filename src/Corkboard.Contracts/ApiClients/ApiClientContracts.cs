namespace Corkboard.Contracts.ApiClients;

public record CreateApiClientRequest(string Name, IReadOnlyList<string> Scopes);

public record ApiClientResponse(
    Guid Id,
    string Name,
    string ClientId,
    IReadOnlyList<string> Scopes,
    bool IsRevoked,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastUsedAt,
    // True for exactly one seeded row — the Angular GUI itself. Has full access via each caller's own FamilyRole, not scopes; can't be revoked.
    bool IsFirstParty);

/// <summary>Returned only once, immediately after creation — the only time the plaintext secret is ever exposed.</summary>
public record CreatedApiClientResponse(ApiClientResponse Client, string ClientSecret);

public record ApiCallLogEntryResponse(
    string Method,
    string Path,
    int StatusCode,
    long DurationMs,
    DateTimeOffset Timestamp);

/// <summary>client_id/client_secret grant — named after OAuth2's client-credentials grant even though this isn't full OAuth2.</summary>
public record ApiClientTokenRequest(string ClientId, string ClientSecret);

public record ApiClientTokenResponse(string Token, DateTimeOffset ExpiresAt, IReadOnlyList<string> Scopes);
