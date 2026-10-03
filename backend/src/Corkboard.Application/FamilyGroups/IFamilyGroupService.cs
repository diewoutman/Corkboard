using Corkboard.Application.Common;
using Corkboard.Contracts.FamilyGroups;

namespace Corkboard.Application.FamilyGroups;

public interface IFamilyGroupService
{
    Task<IReadOnlyList<FamilyGroupResponse>> ListAsync(Guid familyId, CancellationToken cancellationToken);
    Task<Result<FamilyGroupResponse>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken);
    Task<FamilyGroupResponse> CreateAsync(Guid familyId, CreateFamilyGroupRequest request, CancellationToken cancellationToken);
    Task<Result<FamilyGroupResponse>> UpdateAsync(Guid familyId, Guid id, UpdateFamilyGroupRequest request, CancellationToken cancellationToken);
    Task<Result<FamilyGroupResponse>> AssignMembersAsync(Guid familyId, Guid id, AssignFamilyGroupMembersRequest request, CancellationToken cancellationToken);
    Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken);
}
