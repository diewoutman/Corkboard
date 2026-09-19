using Microsoft.AspNetCore.Identity;

namespace Corkboard.Infrastructure.Identity;

/// <summary>
/// The login-capable account (ASP.NET Core Identity). Kept in Infrastructure, not
/// Domain, since it ties directly to Identity's EF Core plumbing; Domain entities
/// that reference a user (FamilyMember.LinkedUserId, UserFamily.UserId) do so via a
/// bare Guid, not a navigation property.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>
{
    /// <summary>
    /// This app's instance-level administrator — distinct from a Family's Owner
    /// role. Granted once, automatically, to the very first user (see
    /// AuthController.Register), independent of any UserFamily/FamilyRole.
    /// </summary>
    public bool IsSystemOwner { get; set; }

    /// <summary>
    /// The user's chosen UI language (a code from <c>SupportedLanguages</c>), or null
    /// while they haven't picked one — the client then falls back to the browser's
    /// language. Stored per account so the choice follows them across devices.
    /// </summary>
    public string? Language { get; set; }
}
