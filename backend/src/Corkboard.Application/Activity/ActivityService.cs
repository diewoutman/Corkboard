using Corkboard.Application.Common;
using Corkboard.Contracts.Activity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Activity;

public class ActivityService(CorkboardDbContext db) : IActivityService
{
    public async Task<PagedResult<ActivityResponse>> ListAsync(Guid familyId, PageRequest page, CancellationToken cancellationToken)
    {
        var query = from activity in db.Activities.AsNoTracking()
                    join member in db.FamilyMembers.AsNoTracking()
                        on new { activity.FamilyId, UserId = (Guid?)activity.ActorUserId }
                        equals new { member.FamilyId, UserId = member.LinkedUserId }
                        into members
                    from member in members.DefaultIfEmpty()
                    where activity.FamilyId == familyId
                    orderby activity.CreatedAt descending, activity.Id
                    select new ActivityResponse(
                        activity.Id,
                        member == null ? "Someone" : member.DisplayName,
                        activity.Action,
                        activity.SubjectType,
                        activity.SubjectId,
                        activity.SubjectTitle,
                        activity.CreatedAt);

        return await query.ToPagedAsync(page, cancellationToken);
    }
}
