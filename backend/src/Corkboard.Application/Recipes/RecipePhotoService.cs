using Corkboard.Application.Common;
using Corkboard.Contracts.Recipes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Recipes;

public class RecipePhotoService(CorkboardDbContext db) : IRecipePhotoService
{
    /// <summary>Kestrel/RequestSizeLimit on the controller already rejects anything bigger before the body is even read — this is defense in depth.</summary>
    private const long MaxFileSize = 8 * 1024 * 1024;

    private static readonly HashSet<string> AllowedContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
    };

    public async Task<Result<RecipePhotoResponse>> UploadAsync(Guid familyId, Guid userId, Guid recipeId, byte[] data, string contentType, CancellationToken cancellationToken)
    {
        if (!await RecipeExistsAsync(familyId, recipeId, cancellationToken)) return Result<RecipePhotoResponse>.Failure(Error.NotFound());

        if (data.Length == 0 || data.Length > MaxFileSize || !AllowedContentTypes.Contains(contentType))
        {
            return Result<RecipePhotoResponse>.Failure(Error.BadRequest(
                "Invalid photo", "Photos must be a JPEG, PNG, WEBP or GIF up to 8 MB."));
        }

        // A Recipe has at most one header photo — a new upload replaces whatever was there (RecipeId is a unique FK).
        var existing = await db.RecipePhotos.FirstOrDefaultAsync(p => p.RecipeId == recipeId, cancellationToken);
        if (existing is not null) db.RecipePhotos.Remove(existing);

        var photo = new RecipePhoto
        {
            Id = Guid.NewGuid(),
            RecipeId = recipeId,
            ContentType = contentType,
            CreatedAt = DateTimeOffset.UtcNow,
        };
        db.RecipePhotos.Add(photo);
        db.RecipePhotoBlobs.Add(new RecipePhotoBlob { Id = photo.Id, Data = data });
        await db.SaveChangesAsync(cancellationToken);

        return Result<RecipePhotoResponse>.Success(new RecipePhotoResponse(photo.Id));
    }

    public async Task<Result<RecipePhotoData>> GetAsync(Guid familyId, Guid userId, Guid recipeId, CancellationToken cancellationToken)
    {
        var photo = await db.RecipePhotos
            .Where(p => p.RecipeId == recipeId && p.Recipe.FamilyId == familyId)
            .Join(db.RecipePhotoBlobs, p => p.Id, b => b.Id, (p, b) => new { b.Data, p.ContentType })
            .FirstOrDefaultAsync(cancellationToken);

        return photo is null
            ? Result<RecipePhotoData>.Failure(Error.NotFound())
            : Result<RecipePhotoData>.Success(new RecipePhotoData(photo.Data, photo.ContentType));
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid recipeId, CancellationToken cancellationToken)
    {
        var photo = await db.RecipePhotos.FirstOrDefaultAsync(
            p => p.RecipeId == recipeId && p.Recipe.FamilyId == familyId, cancellationToken);
        if (photo is null) return Result.Failure(Error.NotFound());

        db.RecipePhotos.Remove(photo);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    private Task<bool> RecipeExistsAsync(Guid familyId, Guid recipeId, CancellationToken cancellationToken) =>
        db.Nodes.OfType<Recipe>().AnyAsync(r => r.Id == recipeId && r.FamilyId == familyId, cancellationToken);
}
