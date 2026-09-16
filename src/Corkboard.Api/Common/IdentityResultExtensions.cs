using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Common;

public static class IdentityResultExtensions
{
    /// <summary>Maps a failed Identity <see cref="IdentityResult"/> onto ModelState and returns a 400 ValidationProblem.</summary>
    public static ActionResult ToValidationProblem(this IdentityResult result, ControllerBase controller)
    {
        foreach (var error in result.Errors)
        {
            controller.ModelState.AddModelError(error.Code, error.Description);
        }

        return controller.ValidationProblem(controller.ModelState);
    }
}
