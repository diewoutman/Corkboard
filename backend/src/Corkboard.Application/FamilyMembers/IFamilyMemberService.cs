using Corkboard.Application.Common;
using Corkboard.Contracts.FamilyMembers;

namespace Corkboard.Application.FamilyMembers;

public interface IFamilyMemberService
{
    Task<PagedResult<FamilyMemberResponse>> ListAsync(Guid familyId, PageRequest page, CancellationToken cancellationToken);

    Task<Result<FamilyMemberResponse>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken);

    Task<FamilyMemberResponse> CreateAsync(Guid familyId, CreateFamilyMemberRequest request, CancellationToken cancellationToken);

    Task<Result<FamilyMemberResponse>> UpdateAsync(Guid familyId, Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken);

    /// <summary>
    /// Creates a login for a FamilyMember who doesn't have one yet — the Owner-only
    /// check itself is a JWT-claim/auth concern and stays in FamilyMembersController;
    /// this covers the rest: role validation, the target member's state, and the
    /// actual account creation + linking.
    /// </summary>
    Task<Result<FamilyMemberResponse>> CreateAccountAsync(Guid familyId, Guid id, CreateFamilyMemberAccountRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken);
}
