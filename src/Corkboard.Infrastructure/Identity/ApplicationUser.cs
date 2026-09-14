using Microsoft.AspNetCore.Identity;

namespace Corkboard.Infrastructure.Identity;

/// <summary>
/// The login-capable account (ASP.NET Core Identity). Kept in Infrastructure, not
/// Domain, since it ties directly to Identity's EF Core plumbing; Domain entities
/// that reference a user (FamilyMember.LinkedUserId, UserFamily.UserId) do so via a
/// bare Guid, not a navigation property.
/// </summary>
public class ApplicationUser : IdentityUser<Guid>;
