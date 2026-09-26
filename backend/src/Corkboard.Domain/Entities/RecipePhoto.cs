namespace Corkboard.Domain.Entities;

/// <summary>
/// Metadata for a Recipe's one header photo (also its list-view thumbnail). The bytes live in
/// <see cref="RecipePhotoBlob"/>, a separate table sharing this row's Id as its own primary key —
/// split out so that listing/loading Recipe nodes (which eager-loads this to expose PhotoId) doesn't
/// drag the up-to-8MB image bytes along for the ride; only RecipePhotoService's single-photo GET
/// touches the blob table. RecipeId is unique — uploading a new photo replaces this row.
/// </summary>
public class RecipePhoto
{
    public Guid Id { get; set; }

    public Guid RecipeId { get; set; }
    public Recipe Recipe { get; set; } = null!;

    public required string ContentType { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
