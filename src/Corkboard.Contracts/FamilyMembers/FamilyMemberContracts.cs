namespace Corkboard.Contracts.FamilyMembers;

/// <summary>Mirrors Corkboard.Domain.Entities.FamilyRole — kept in sync by hand.</summary>
public enum FamilyRole
{
    Owner,
    Adult,
    Member,
}

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

/// <summary>
/// Creates a login for an existing FamilyMember who doesn't have one yet — the
/// Owner-only alternative to self-registration (closed once a Family exists,
/// see AuthController.Register). Role can't be Owner; that's set once, when the
/// Family itself is created.
/// </summary>
public record CreateFamilyMemberAccountRequest(string Email, string Password, FamilyRole Role);

public record FamilyMemberResponse(
    Guid Id,
    string DisplayName,
    string Color,
    string? AvatarUrl,
    Guid? LinkedUserId,
    DateOnly? DateOfBirth,
    /// <summary>Null unless LinkedUserId is set.</summary>
    string? LinkedUserEmail,
    /// <summary>Null unless LinkedUserId is set.</summary>
    FamilyRole? LinkedUserRole);
