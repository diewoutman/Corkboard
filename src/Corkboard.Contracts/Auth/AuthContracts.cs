namespace Corkboard.Contracts.Auth;

public record RegisterRequest(string Email, string Password);

public record LoginRequest(string Email, string Password);

/// <summary>FamilyId/Role are null until the caller has set up (or joined) a Family.</summary>
public record AuthResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    Guid UserId,
    string Email,
    Guid? FamilyId,
    string? Role);
