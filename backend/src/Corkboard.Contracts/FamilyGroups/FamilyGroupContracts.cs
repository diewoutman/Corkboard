using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.FamilyGroups;

public record CreateFamilyGroupRequest([Required, StringLength(100, MinimumLength = 1)] string Name, [StringLength(20)] string? Color);
public record UpdateFamilyGroupRequest([Required, StringLength(100, MinimumLength = 1)] string Name, [StringLength(20)] string? Color);
public record FamilyGroupResponse(Guid Id, string Name, string? Color, IReadOnlyList<Guid> MemberIds);
public record AssignFamilyGroupMembersRequest(IReadOnlyList<Guid> MemberIds);
