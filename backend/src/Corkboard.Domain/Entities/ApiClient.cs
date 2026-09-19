namespace Corkboard.Domain.Entities;

/// <summary>
/// A machine/automation caller provisioned by the system owner (see
/// ApplicationUser.IsSystemOwner) — client-credentials style auth, instance-wide
/// rather than tied to a Family. Secrets are generated like Collection.FeedToken
/// but, unlike a feed token, never stored or returned in plaintext after creation.
/// </summary>
public class ApiClient
{
    public Guid Id { get; set; }

    public required string Name { get; set; }

    /// <summary>Public identifier sent as clientId at the token endpoint — opaque, not itself a secret.</summary>
    public required string ClientId { get; set; }

    /// <summary>PBKDF2 hash of the client secret — the plaintext is never stored.</summary>
    public required string ClientSecretHash { get; set; }

    /// <summary>Space-delimited scope list, e.g. "nodes:read calendar:read calendar:write" — see ApiScopes.</summary>
    public required string Scopes { get; set; }

    public bool IsRevoked { get; set; }

    /// <summary>
    /// True for exactly one seeded row — the Angular GUI itself (see
    /// Program.cs's startup seed and TokenService.CreateTokenAsync). Has no
    /// secret and no scope restriction: a human token derives its access from
    /// FamilyRole as always, this just gives it a client identity for logging.
    /// </summary>
    public bool IsFirstParty { get; set; }

    public DateTimeOffset CreatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTimeOffset? LastUsedAt { get; set; }
}
