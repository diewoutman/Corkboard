namespace Corkboard.Api.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Issuer { get; init; }
    public required string Audience { get; init; }
    public required string SigningKey { get; init; }
    public int ExpiryMinutes { get; init; } = 60 * 24 * 14;
}
