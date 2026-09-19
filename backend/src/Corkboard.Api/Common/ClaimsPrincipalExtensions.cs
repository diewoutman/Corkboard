using System.Security.Claims;
using Corkboard.Api.Auth;

namespace Corkboard.Api.Common;

public static class ClaimsPrincipalExtensions
{
    public static Guid GetUserId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Token has no NameIdentifier claim.");
        return Guid.Parse(value);
    }

    /// <summary>Null when the caller hasn't set up (or joined) a Family yet.</summary>
    public static Guid? GetFamilyId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(CorkboardClaimTypes.FamilyId);
        return value is null ? null : Guid.Parse(value);
    }

    /// <summary>Null when the caller hasn't set up (or joined) a Family yet.</summary>
    public static string? GetFamilyRole(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(CorkboardClaimTypes.FamilyRole);

    /// <summary>
    /// This app's instance-level administrator — see ApplicationUser.IsSystemOwner.
    /// Independent of FamilyRole; always false for a client-credentials token.
    /// </summary>
    public static bool IsSystemOwner(this ClaimsPrincipal principal) =>
        principal.HasClaim(c => c.Type == CorkboardClaimTypes.SystemOwner);

    /// <summary>
    /// True for any request tied to a registered ApiClient — both the Angular
    /// GUI's own first-party client and an external client-credentials
    /// caller. Used by ApiCallLoggingMiddleware to decide whether (and to
    /// which ApiClient) to log a call.
    /// </summary>
    public static bool IsApiClient(this ClaimsPrincipal principal) =>
        principal.HasClaim(c => c.Type == CorkboardClaimTypes.ClientId);

    /// <summary>The ApiClient row this request is tied to, or null for a request with no client identity at all (e.g. anonymous).</summary>
    public static Guid? GetApiClientId(this ClaimsPrincipal principal)
    {
        var value = principal.FindFirstValue(CorkboardClaimTypes.ClientId);
        return value is null ? null : Guid.Parse(value);
    }

    /// <summary>
    /// True only for an external client-credentials token — the GUI's own
    /// first-party token carries a ClientId claim (see IsApiClient) but never
    /// a Scope claim, so RequireScopeAttribute only gates the former.
    /// </summary>
    public static bool IsScopedClient(this ClaimsPrincipal principal) =>
        principal.HasClaim(c => c.Type == CorkboardClaimTypes.Scope);

    /// <summary>Empty unless IsScopedClient is true.</summary>
    public static IReadOnlyList<string> GetScopes(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(CorkboardClaimTypes.Scope)?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? [];
}
