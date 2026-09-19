using Corkboard.Application.Common;
using Corkboard.Contracts.Families;

namespace Corkboard.Application.Families;

public interface IFamilyService
{
    /// <summary>
    /// Creates the caller's Family plus the FamilyMember representing them in it (as
    /// Owner) — the "Family setup, seeded on first run" MVP flow (CONCEPT.md §5/§8).
    /// Minting the fresh token carrying the new FamilyId claim stays in
    /// FamiliesController — token issuance is an HTTP-auth concern, not this one.
    /// </summary>
    Task<Result<FamilyResponse>> CreateAsync(Guid userId, CreateFamilyRequest request, CancellationToken cancellationToken);

    Task<Result<FamilyResponse>> GetMineAsync(Guid familyId, CancellationToken cancellationToken);

    /// <summary>Renames a Family / changes its TimeZone — used by the admin console (AdminController), which isn't itself a member of the Family it's editing.</summary>
    Task<Result<FamilyResponse>> UpdateAsync(Guid familyId, UpdateFamilyRequest request, CancellationToken cancellationToken);
}
