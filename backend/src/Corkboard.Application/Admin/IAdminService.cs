using Corkboard.Contracts.Admin;

namespace Corkboard.Application.Admin;

public interface IAdminService
{
    Task<AdminStatsResponse> GetStatsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<AdminFamilySummaryResponse>> ListFamiliesAsync(CancellationToken cancellationToken);
}
