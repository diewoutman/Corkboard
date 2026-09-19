namespace Corkboard.Domain.Entities;

/// <summary>
/// Links a login-capable User (an ASP.NET Core Identity account, owned by
/// Corkboard.Infrastructure) to a Family, with the Role that User holds in it.
/// Kept as a bare Guid FK rather than a navigation property so Domain has no
/// dependency on Identity.
/// </summary>
public class UserFamily
{
    public Guid UserId { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public FamilyRole Role { get; set; }
}
