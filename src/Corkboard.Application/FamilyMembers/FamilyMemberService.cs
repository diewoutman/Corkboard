using Corkboard.Application.Common;
using Corkboard.Contracts.FamilyMembers;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ContractFamilyRole = Corkboard.Contracts.FamilyMembers.FamilyRole;
using DomainFamilyRole = Corkboard.Domain.Entities.FamilyRole;

namespace Corkboard.Application.FamilyMembers;

public class FamilyMemberService(CorkboardDbContext db, UserManager<ApplicationUser> userManager) : IFamilyMemberService
{
    public async Task<IReadOnlyList<FamilyMemberResponse>> ListAsync(Guid familyId, CancellationToken cancellationToken)
    {
        var members = await db.FamilyMembers.AsNoTracking().Where(m => m.FamilyId == familyId).ToListAsync(cancellationToken);
        var linkedAccounts = await GetLinkedAccountsAsync(familyId, members, cancellationToken);

        return members.Select(m => ToResponseValue(m, linkedAccounts)).ToList();
    }

    public async Task<Result<FamilyMemberResponse>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var member = await db.FamilyMembers.AsNoTracking().FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return Result<FamilyMemberResponse>.Failure(Error.NotFound());

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Result<FamilyMemberResponse>.Success(ToResponseValue(member, linkedAccounts));
    }

    public async Task<FamilyMemberResponse> CreateAsync(Guid familyId, CreateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        var member = new FamilyMember
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            DisplayName = request.DisplayName,
            Color = request.Color,
            AvatarUrl = request.AvatarUrl,
            LinkedUserId = request.LinkedUserId,
            DateOfBirth = request.DateOfBirth,
        };

        db.FamilyMembers.Add(member);
        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return ToResponseValue(member, linkedAccounts);
    }

    public async Task<Result<FamilyMemberResponse>> UpdateAsync(Guid familyId, Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return Result<FamilyMemberResponse>.Failure(Error.NotFound());

        member.DisplayName = request.DisplayName;
        member.Color = request.Color;
        member.AvatarUrl = request.AvatarUrl;
        member.LinkedUserId = request.LinkedUserId;
        member.DateOfBirth = request.DateOfBirth;

        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Result<FamilyMemberResponse>.Success(ToResponseValue(member, linkedAccounts));
    }

    public async Task<Result<FamilyMemberResponse>> CreateAccountAsync(Guid familyId, Guid id, CreateFamilyMemberAccountRequest request, CancellationToken cancellationToken)
    {
        if (request.Role == ContractFamilyRole.Owner)
        {
            return Result<FamilyMemberResponse>.Failure(Error.BadRequest(
                "Invalid role", "A family has exactly one Owner, set when it was created."));
        }

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return Result<FamilyMemberResponse>.Failure(Error.NotFound());

        if (member.LinkedUserId is not null)
        {
            return Result<FamilyMemberResponse>.Failure(Error.Conflict(
                "Already has an account", "This family member already has a login."));
        }

        var user = new ApplicationUser { UserName = request.Email, Email = request.Email };
        var result = await userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded) return Result<FamilyMemberResponse>.Failure(Error.Validation(result.Errors));

        db.UserFamilies.Add(new UserFamily { UserId = user.Id, FamilyId = familyId, Role = (DomainFamilyRole)request.Role });
        member.LinkedUserId = user.Id;
        await db.SaveChangesAsync(cancellationToken);

        var linkedAccounts = await GetLinkedAccountsAsync(familyId, [member], cancellationToken);
        return Result<FamilyMemberResponse>.Success(ToResponseValue(member, linkedAccounts));
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return Result.Failure(Error.NotFound());

        db.FamilyMembers.Remove(member);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    private record LinkedAccount(string? Email, DomainFamilyRole? Role);

    /// <summary>Bulk-fetches email/role for whichever of the given members have a LinkedUserId.</summary>
    private async Task<Dictionary<Guid, LinkedAccount>> GetLinkedAccountsAsync(Guid familyId, IReadOnlyList<FamilyMember> members, CancellationToken cancellationToken)
    {
        var userIds = members.Where(m => m.LinkedUserId is not null).Select(m => m.LinkedUserId!.Value).Distinct().ToList();
        if (userIds.Count == 0) return [];

        var emailsById = await db.Users.AsNoTracking()
            .Where(u => userIds.Contains(u.Id))
            .ToDictionaryAsync(u => u.Id, u => u.Email, cancellationToken);

        var rolesById = await db.UserFamilies.AsNoTracking()
            .Where(uf => uf.FamilyId == familyId && userIds.Contains(uf.UserId))
            .ToDictionaryAsync(uf => uf.UserId, uf => uf.Role, cancellationToken);

        return userIds.ToDictionary(
            id => id,
            id => new LinkedAccount(
                emailsById.GetValueOrDefault(id),
                rolesById.TryGetValue(id, out var role) ? role : null));
    }

    private static FamilyMemberResponse ToResponseValue(FamilyMember m, IReadOnlyDictionary<Guid, LinkedAccount> linkedAccounts)
    {
        var linked = m.LinkedUserId is { } userId && linkedAccounts.TryGetValue(userId, out var account) ? account : null;
        return new FamilyMemberResponse(
            m.Id, m.DisplayName, m.Color, m.AvatarUrl, m.LinkedUserId, m.DateOfBirth,
            linked?.Email, (ContractFamilyRole?)linked?.Role);
    }
}
