using Corkboard.Application.Common;
using Corkboard.Contracts.Dashboard;

namespace Corkboard.Application.Dashboard;

public interface IDashboardService
{
    /// <summary>Personal is scoped to the caller specifically; Family is shared by the whole Family.</summary>
    Task<PagedResult<DashboardWidgetResponse>> ListAsync(Guid familyId, Guid userId, DashboardWidgetScope scope, PageRequest page, CancellationToken cancellationToken);

    /// <summary>isAdmin gates creating a Family-scope widget (Owner/Adult only) — ignored for Personal.</summary>
    Task<Result<DashboardWidgetResponse>> CreateAsync(Guid familyId, Guid userId, bool isAdmin, CreateDashboardWidgetRequest request, CancellationToken cancellationToken);

    Task<Result<DashboardWidgetResponse>> UpdateAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken);

    /// <summary>Resizing — how many grid columns wide the caller wants this widget's card.</summary>
    Task<Result<DashboardWidgetResponse>> UpdateSpanAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, UpdateDashboardWidgetSpanRequest request, CancellationToken cancellationToken);

    /// <summary>Drag-and-drop reordering — the caller sends its whole new order for one dashboard, SortOrder becomes each id's index.</summary>
    Task<Result<IReadOnlyList<DashboardWidgetResponse>>> ReorderAsync(Guid familyId, Guid userId, DashboardWidgetScope scope, bool isAdmin, ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid familyId, Guid userId, bool isAdmin, Guid id, CancellationToken cancellationToken);
}
