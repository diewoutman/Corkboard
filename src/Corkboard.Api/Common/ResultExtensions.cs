using Corkboard.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Common;

/// <summary>Turns an Application-layer <see cref="Result"/>/<see cref="Result{T}"/> into the matching ActionResult.</summary>
public static class ResultExtensions
{
    public static ActionResult<T> ToActionResult<T>(this Result<T> result, ControllerBase controller)
    {
        if (result.IsSuccess) return controller.Ok(result.Value);
        return ToProblem(controller, result.Error!);
    }

    /// <summary>For a successful POST that should reply 201 Created, pointing at <paramref name="actionName"/>.</summary>
    public static ActionResult<T> ToCreatedActionResult<T>(this Result<T> result, ControllerBase controller, string actionName, Func<T, object> routeValues)
    {
        if (result.IsSuccess) return controller.CreatedAtAction(actionName, routeValues(result.Value), result.Value);
        return ToProblem(controller, result.Error!);
    }

    public static IActionResult ToActionResult(this Result result, ControllerBase controller)
    {
        if (result.IsSuccess) return controller.NoContent();
        return ToProblem(controller, result.Error!);
    }

    /// <summary>
    /// For a service call whose failure needs mapping to a *different* success type than
    /// the one the service itself deals in — e.g. FamiliesController.Create, where
    /// IFamilyService only produces the FamilyResponse half of the eventual
    /// AuthenticatedFamilyResponse.
    /// </summary>
    public static ActionResult<T> ToActionResult<T>(this Error error, ControllerBase controller) => ToProblem(controller, error);

    /// <summary>
    /// A bare 404 (no ProblemDetails title/detail) matches every existing not-found
    /// response in this API (e.g. NodesController.Get's <c>NotFound()</c>) — once the
    /// global ProblemDetails middleware is registered (see Program.cs) it fills in a
    /// standard body for this the same way it does for those. A ValidationErrors-carrying
    /// Error (a failed Identity operation) instead becomes the same per-field
    /// ValidationProblem IdentityResultExtensions.ToValidationProblem produces.
    /// </summary>
    private static ActionResult ToProblem(ControllerBase controller, Error error)
    {
        if (error.StatusCode == 404) return controller.NotFound();

        if (error.ValidationErrors is { } validationErrors)
        {
            foreach (var (code, description) in validationErrors)
            {
                controller.ModelState.AddModelError(code, description);
            }

            return controller.ValidationProblem(controller.ModelState);
        }

        return controller.Problem(title: error.Title, detail: error.Detail, statusCode: error.StatusCode);
    }
}
