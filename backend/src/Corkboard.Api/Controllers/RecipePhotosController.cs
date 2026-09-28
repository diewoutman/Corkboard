using Corkboard.Api.Common;
using Corkboard.Application.Recipes;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Recipes;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Controllers;

/// <summary>
/// A Recipe's one header photo rides under the "nodes" scope — it's a sub-resource of a
/// Recipe Node, same as Contacts' phone numbers/emails, not their own permission area.
/// A GET here returns the raw image bytes (not JSON) so it can be used directly as
/// an &lt;img&gt; source once fetched through the authenticated HttpClient (see the
/// client's AuthImageComponent) — this API has no anonymous/token-in-URL access
/// like the calendar feed's, since photos aren't meant to be shared outside a login.
/// </summary>
[ApiController]
[Route("api/recipes/{recipeId:guid}/photo")]
[RequireScope(ApiScopes.Nodes)]
public class RecipePhotosController(IRecipePhotoService photoService) : FamilyScopedControllerBase
{
    private const long MaxFileSize = 8 * 1024 * 1024;

    [HttpPost]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<ActionResult<RecipePhotoResponse>> Upload(Guid recipeId, IFormFile file, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        using var stream = new MemoryStream();
        await file.CopyToAsync(stream, cancellationToken);

        var result = await photoService.UploadAsync(familyId, CurrentUserId, recipeId, stream.ToArray(), file.ContentType, cancellationToken);
        return result.ToActionResult(this);
    }

    [HttpGet]
    public async Task<IActionResult> Get(Guid recipeId, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await photoService.GetAsync(familyId, CurrentUserId, recipeId, cancellationToken);
        if (!result.IsSuccess) return NotFound();

        return File(result.Value.Data, result.Value.ContentType);
    }

    [HttpDelete]
    public async Task<IActionResult> Delete(Guid recipeId, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var result = await photoService.DeleteAsync(familyId, CurrentUserId, recipeId, cancellationToken);
        return result.ToActionResult(this);
    }
}
