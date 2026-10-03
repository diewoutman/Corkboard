using Corkboard.Application.Common;
using Corkboard.Contracts.FamilyGroups;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.FamilyGroups;

public class FamilyGroupService(CorkboardDbContext db) : IFamilyGroupService
{
    public async Task<IReadOnlyList<FamilyGroupResponse>> ListAsync(Guid familyId, CancellationToken cancellationToken) =>
        await db.FamilyGroups.AsNoTracking().Where(g => g.FamilyId == familyId).OrderBy(g => g.Name)
            .Select(g => new FamilyGroupResponse(g.Id, g.Name, g.Color, g.Memberships.Select(m => m.FamilyMemberId).ToList()))
            .ToListAsync(cancellationToken);

    public async Task<Result<FamilyGroupResponse>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var group = await db.FamilyGroups.AsNoTracking().Where(g => g.FamilyId == familyId && g.Id == id)
            .Select(g => new FamilyGroupResponse(g.Id, g.Name, g.Color, g.Memberships.Select(m => m.FamilyMemberId).ToList())).FirstOrDefaultAsync(cancellationToken);
        return group is null ? Result<FamilyGroupResponse>.Failure(Error.NotFound()) : Result<FamilyGroupResponse>.Success(group);
    }

    public async Task<FamilyGroupResponse> CreateAsync(Guid familyId, CreateFamilyGroupRequest request, CancellationToken cancellationToken)
    {
        var group = new FamilyGroup { Id = Guid.NewGuid(), FamilyId = familyId, Name = request.Name.Trim(), Color = request.Color, CreatedAt = DateTimeOffset.UtcNow };
        db.FamilyGroups.Add(group);
        await db.SaveChangesAsync(cancellationToken);
        return new FamilyGroupResponse(group.Id, group.Name, group.Color, []);
    }

    public async Task<Result<FamilyGroupResponse>> UpdateAsync(Guid familyId, Guid id, UpdateFamilyGroupRequest request, CancellationToken cancellationToken)
    {
        var group = await db.FamilyGroups.FirstOrDefaultAsync(g => g.FamilyId == familyId && g.Id == id, cancellationToken);
        if (group is null) return Result<FamilyGroupResponse>.Failure(Error.NotFound());
        group.Name = request.Name.Trim(); group.Color = request.Color;
        await db.SaveChangesAsync(cancellationToken);
        return await GetAsync(familyId, id, cancellationToken);
    }

    public async Task<Result<FamilyGroupResponse>> AssignMembersAsync(Guid familyId, Guid id, AssignFamilyGroupMembersRequest request, CancellationToken cancellationToken)
    {
        var group = await db.FamilyGroups.Include(g => g.Memberships).FirstOrDefaultAsync(g => g.FamilyId == familyId && g.Id == id, cancellationToken);
        if (group is null) return Result<FamilyGroupResponse>.Failure(Error.NotFound());
        var memberIds = request.MemberIds.Distinct().ToHashSet();
        var validIds = await db.FamilyMembers.Where(m => m.FamilyId == familyId && memberIds.Contains(m.Id)).Select(m => m.Id).ToListAsync(cancellationToken);
        if (validIds.Count != memberIds.Count) return Result<FamilyGroupResponse>.Failure(Error.BadRequest("Invalid members", "All members must belong to this family."));
        group.Memberships.Clear();
        group.Memberships.AddRange(validIds.Select(memberId => new FamilyGroupMembership { FamilyGroupId = id, FamilyMemberId = memberId }));
        await db.SaveChangesAsync(cancellationToken);
        return await GetAsync(familyId, id, cancellationToken);
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken)
    {
        var group = await db.FamilyGroups.FirstOrDefaultAsync(g => g.FamilyId == familyId && g.Id == id, cancellationToken);
        if (group is null) return Result.Failure(Error.NotFound());
        db.FamilyGroups.Remove(group); await db.SaveChangesAsync(cancellationToken); return Result.Success();
    }
}
