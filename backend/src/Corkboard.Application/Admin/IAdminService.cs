using Corkboard.Application.Common;
using Corkboard.Contracts.Admin;

namespace Corkboard.Application.Admin;

public interface IAdminService
{
    Task<AdminStatsResponse> GetStatsAsync(CancellationToken cancellationToken);

    Task<PagedResult<AdminFamilySummaryResponse>> ListFamiliesAsync(PageRequest page, CancellationToken cancellationToken);
}
