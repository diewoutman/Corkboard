namespace Corkboard.Contracts.Collections;

public record CreateCollectionRequest(
    string Name,
    CollectionType Type,
    string Color,
    Guid? ParentCollectionId);

public record UpdateCollectionRequest(string Name, string Color);

public record CollectionResponse(
    Guid Id,
    string Name,
    CollectionType Type,
    string Color,
    Guid? ParentCollectionId,
    DateTimeOffset CreatedAt,
    /// <summary>Total Nodes directly in this Collection (not counting child Collections).</summary>
    int NodeCount,
    /// <summary>
    /// For a TaskList: how many of its Tasks aren't done yet. Null for
    /// Collection types where "incomplete" doesn't mean anything.
    /// </summary>
    int? IncompleteCount,
    /// <summary>Set only once a feed URL has been requested — see POST .../feed-token.</summary>
    string? FeedUrl);
