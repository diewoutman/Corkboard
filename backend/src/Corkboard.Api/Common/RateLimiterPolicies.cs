namespace Corkboard.Api.Common;

/// <summary>Named rate-limiter policies registered in Program.cs (AddRateLimiter), referenced from controllers via [EnableRateLimiting].</summary>
public static class RateLimiterPolicies
{
    /// <summary>Applied to unauthenticated credential-checking endpoints (login, client-credentials token, account creation) to slow down brute-force/credential-stuffing attempts.</summary>
    public const string Auth = "auth";
}
