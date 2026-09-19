namespace Corkboard.Application.Common;

/// <summary>
/// An expected business-rule failure a service returns instead of throwing — see
/// <see cref="Result{T}"/>. StatusCode is a plain HTTP status code; kept as an int
/// rather than referencing ASP.NET Core's StatusCodes so this project has no web
/// dependency — <c>ResultExtensions</c> in Corkboard.Api is the only place that
/// turns this into an actual response.
/// </summary>
public sealed record Error(string Title, string? Detail, int StatusCode)
{
    /// <summary>
    /// Set only for a failed Identity operation (e.g. UserManager.CreateAsync) — lets
    /// ResultExtensions.ToActionResult build the same per-field ValidationProblem that
    /// IdentityResultExtensions.ToValidationProblem produces for controllers that call
    /// Identity directly (AuthController, SetupController).
    /// </summary>
    public IReadOnlyList<(string Code, string Description)>? ValidationErrors { get; init; }

    public static Error NotFound() => new("Not found", null, 404);

    public static Error BadRequest(string title, string? detail = null) => new(title, detail, 400);

    public static Error Conflict(string title, string? detail = null) => new(title, detail, 409);

    public static Error Forbidden(string title, string? detail = null) => new(title, detail, 403);

    public static Error Validation(IEnumerable<Microsoft.AspNetCore.Identity.IdentityError> errors) =>
        new("Validation failed", null, 400) { ValidationErrors = errors.Select(e => (e.Code, e.Description)).ToList() };
}
