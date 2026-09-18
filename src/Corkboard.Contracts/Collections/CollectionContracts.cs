using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.Collections;

public record CreateCollectionRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Name,
    CollectionType Type,
    [Required, StringLength(20)] string Color,
    Guid? ParentCollectionId,
    // Household-only — shared address its member Contacts fall back to
    [StringLength(200)] string? Street,
    [StringLength(100)] string? City,
    [StringLength(20)] string? PostalCode,
    [StringLength(100)] string? Country);

public record UpdateCollectionRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Name,
    [Required, StringLength(20)] string Color,
    // Household-only
    [StringLength(200)] string? Street,
    [StringLength(100)] string? City,
    [StringLength(20)] string? PostalCode,
    [StringLength(100)] string? Country);

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
    string? FeedUrl,
    // Household-only
    string? Street,
    string? City,
    string? PostalCode,
    string? Country);
