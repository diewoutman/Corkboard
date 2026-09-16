using Corkboard.Application.Common;
using Corkboard.Contracts.Dashboard;

namespace Corkboard.Application.Dashboard;

public interface IDashboardService
{
    /// <summary>Widgets belong to the caller specifically, not the whole Family — every method here is scoped the same way.</summary>
    Task<IReadOnlyList<DashboardWidgetResponse>> ListAsync(Guid familyId, Guid userId, CancellationToken cancellationToken);

    Task<Result<DashboardWidgetResponse>> CreateAsync(Guid familyId, Guid userId, CreateDashboardWidgetRequest request, CancellationToken cancellationToken);

    Task<Result<DashboardWidgetResponse>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateDashboardWidgetRequest request, CancellationToken cancellationToken);

    /// <summary>Resizing — how many grid columns wide the caller wants this widget's card.</summary>
    Task<Result<DashboardWidgetResponse>> UpdateSpanAsync(Guid familyId, Guid userId, Guid id, UpdateDashboardWidgetSpanRequest request, CancellationToken cancellationToken);

    /// <summary>Drag-and-drop reordering — the caller sends its whole new order, SortOrder becomes each id's index.</summary>
    Task<Result<IReadOnlyList<DashboardWidgetResponse>>> ReorderAsync(Guid familyId, Guid userId, ReorderDashboardWidgetsRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken);
}
