namespace Corkboard.Contracts.FamilyMembers;

public record CreateFamilyMemberRequest(
    string DisplayName,
    string Color,
    string? AvatarUrl,
    Guid? LinkedUserId,
    DateOnly? DateOfBirth);

public record UpdateFamilyMemberRequest(
    string DisplayName,
    string Color,
    string? AvatarUrl,
    Guid? LinkedUserId,
    DateOnly? DateOfBirth);

public record FamilyMemberResponse(
    Guid Id,
    string DisplayName,
    string Color,
    string? AvatarUrl,
    Guid? LinkedUserId,
    DateOnly? DateOfBirth);
