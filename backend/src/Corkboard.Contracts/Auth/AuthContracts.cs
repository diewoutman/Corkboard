using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.Auth;

public record RegisterRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    // Upper bound guards against a password-hashing DoS (an attacker submitting
    // a multi-megabyte "password" to make PBKDF2 expensive); lower bound mirrors
    // Program.cs's Identity password policy (see its comment for why it's 6, not
    // Identity's enterprise-grade default).
    [Required, StringLength(128, MinimumLength = 6)] string Password);

public record LoginRequest(
    [Required, EmailAddress, StringLength(256)] string Email,
    [Required, StringLength(128, MinimumLength = 1)] string Password);

/// <summary>FamilyId/Role are null until the caller has set up (or joined) a Family.</summary>
public record AuthResponse(
    string Token,
    DateTimeOffset ExpiresAt,
    Guid UserId,
    string Email,
    Guid? FamilyId,
    string? Role,
    bool IsSystemOwner,
    string? Language = null);

/// <summary>UI languages the frontend ships translations for — keep in sync with <c>frontend/src/assets/i18n</c>.</summary>
public static class SupportedLanguages
{
    public const string Pattern = "^(en|nl)$";
}

public record UpdateLanguageRequest(
    [Required, RegularExpression(SupportedLanguages.Pattern)] string Language);
