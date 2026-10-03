using Corkboard.Application.Common;
using Corkboard.Contracts.Activity;

namespace Corkboard.Application.Activity;

public interface IActivityService
{
    Task<PagedResult<ActivityResponse>> ListAsync(Guid familyId, PageRequest page, CancellationToken cancellationToken);
}
