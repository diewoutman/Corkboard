namespace Corkboard.Domain.Entities;

/// <summary>
/// The actual bytes for a <see cref="RecipePhoto"/>, kept in its own table (Id shared with
/// the RecipePhoto row as a 1:1 split) so that eager-loading a Recipe's Photos for PhotoIds
/// never pulls image data — only RecipePhotoService's single-photo GET queries this table.
/// </summary>
public class RecipePhotoBlob
{
    public Guid Id { get; set; }

    public required byte[] Data { get; set; }
}
