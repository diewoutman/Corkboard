using Corkboard.Application.Common;
using Corkboard.Contracts.Recipes;

namespace Corkboard.Application.Recipes;

public interface IRecipePhotoService
{
    /// <summary>Takes plain bytes/content-type rather than IFormFile — the Application layer has no ASP.NET Core web dependency (see Error.cs's own note on why StatusCode is a plain int); the controller reads the upload before calling in. Replaces the Recipe's existing photo, if any — there's only ever one.</summary>
    Task<Result<RecipePhotoResponse>> UploadAsync(Guid familyId, Guid userId, Guid recipeId, byte[] data, string contentType, CancellationToken cancellationToken);

    Task<Result<RecipePhotoData>> GetAsync(Guid familyId, Guid userId, Guid recipeId, CancellationToken cancellationToken);

    Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid recipeId, CancellationToken cancellationToken);
}

public record RecipePhotoData(byte[] Data, string ContentType);
