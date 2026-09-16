using Corkboard.Contracts.Nodes;

namespace Corkboard.Application.Nodes;

/// <summary>The query params NodesController.List accepts, unchanged from before the extraction.</summary>
public sealed record NodeListFilter(
    NodeType? Type,
    Guid? AssignedTo,
    Guid? CollectionId,
    DateTimeOffset? From,
    DateTimeOffset? Until);
