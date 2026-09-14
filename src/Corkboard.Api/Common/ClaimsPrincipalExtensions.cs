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
}
