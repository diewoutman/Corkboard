using Corkboard.Application.Common;
using Corkboard.Contracts.Nodes;

namespace Corkboard.Application.Nodes;

public interface INodeService
{
    Task<IReadOnlyList<NodeResponse>> ListAsync(Guid familyId, NodeListFilter filter, CancellationToken cancellationToken);

    Task<Result<NodeResponse>> GetAsync(Guid familyId, Guid id, CancellationToken cancellationToken);

    Task<Result<NodeResponse>> CreateAsync(Guid familyId, Guid userId, CreateNodeRequest request, CancellationToken cancellationToken);

    Task<Result<NodeResponse>> UpdateAsync(Guid familyId, Guid id, UpdateNodeRequest request, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid familyId, Guid id, CancellationToken cancellationToken);
}
