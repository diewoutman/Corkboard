using Corkboard.Application.Common;
using Corkboard.Contracts.Families;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Families;

public class FamilyService(CorkboardDbContext db) : IFamilyService
{
    public async Task<Result<FamilyResponse>> CreateAsync(Guid userId, CreateFamilyRequest request, CancellationToken cancellationToken)
    {
        var alreadyHasFamily = await db.UserFamilies.AnyAsync(uf => uf.UserId == userId, cancellationToken);
        if (alreadyHasFamily)
        {
            return Result<FamilyResponse>.Failure(Error.Conflict(
                "Already in a family", "This account already belongs to a Family."));
        }

        var now = DateTimeOffset.UtcNow;
        var family = new Family
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            TimeZone = request.TimeZone,
            CreatedAt = now,
        };

        db.Families.Add(family);
        db.UserFamilies.Add(new UserFamily
        {
            UserId = userId,
            FamilyId = family.Id,
            Role = FamilyRole.Owner,
        });
        db.FamilyMembers.Add(new FamilyMember
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            DisplayName = request.OwnerDisplayName,
            Color = request.OwnerColor,
            LinkedUserId = userId,
        });

        await db.SaveChangesAsync(cancellationToken);

        return Result<FamilyResponse>.Success(new FamilyResponse(family.Id, family.Name, family.TimeZone, family.CreatedAt));
    }

    public async Task<Result<FamilyResponse>> GetMineAsync(Guid familyId, CancellationToken cancellationToken)
    {
        var family = await db.Families
            .AsNoTracking()
            .Where(f => f.Id == familyId)
            .Select(f => new FamilyResponse(f.Id, f.Name, f.TimeZone, f.CreatedAt))
            .FirstOrDefaultAsync(cancellationToken);

        return family is null ? Result<FamilyResponse>.Failure(Error.NotFound()) : Result<FamilyResponse>.Success(family);
    }
}
