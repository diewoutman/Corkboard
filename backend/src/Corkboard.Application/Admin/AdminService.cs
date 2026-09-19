using Corkboard.Application.Common;
using Corkboard.Contracts.Admin;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Admin;

public class AdminService(CorkboardDbContext db) : IAdminService
{
    public async Task<AdminStatsResponse> GetStatsAsync(CancellationToken cancellationToken) => new(
        await db.Families.CountAsync(cancellationToken),
        await db.Users.CountAsync(cancellationToken),
        await db.ApiClients.CountAsync(c => !c.IsFirstParty, cancellationToken),
        await db.ApiClients.CountAsync(c => !c.IsFirstParty && !c.IsRevoked, cancellationToken),
        await db.FamilyMembers.CountAsync(cancellationToken),
        await db.Nodes.CountAsync(cancellationToken));

    public async Task<PagedResult<AdminFamilySummaryResponse>> ListFamiliesAsync(PageRequest page, CancellationToken cancellationToken) =>
        await db.Families
            .AsNoTracking()
            .OrderBy(f => f.Name).ThenBy(f => f.Id)
            .Select(f => new AdminFamilySummaryResponse(
                f.Id, f.Name, f.TimeZone, f.CreatedAt,
                f.Members.Count,
                db.Nodes.Count(n => n.FamilyId == f.Id)))
            .ToPagedAsync(page, cancellationToken);
}
