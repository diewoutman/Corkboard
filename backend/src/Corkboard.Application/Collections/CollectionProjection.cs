using Corkboard.Domain.Entities;

namespace Corkboard.Application.Collections;

/// <summary>
/// Everything about a Collection except the request-relative feed URL (see
/// CollectionsController.ToResponse, which turns this plus the incoming request's
/// scheme/host into the public CollectionResponse — building an absolute URL is an
/// HTTP-layer concern, not this layer's).
/// </summary>
public record CollectionProjection(
    Guid Id, string Name, CollectionType Type, string Color, Guid? ParentCollectionId,
    DateTimeOffset CreatedAt, int NodeCount, int? IncompleteCount, string? FeedToken,
    string? Street, string? City, string? PostalCode, string? Country);
