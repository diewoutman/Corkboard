using Corkboard.Contracts.ApiClients;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace Corkboard.Api.Common;

/// <summary>
/// Applied at controller level (e.g. [RequireScope(ApiScopes.Nodes)] on
/// NodesController) to gate a resource area behind client-credentials scopes.
/// A human/GUI token always passes — even though it now carries its own
/// client_id claim (see ClaimsPrincipalExtensions.IsApiClient), it never
/// carries a Scope claim, so IsScopedClient is false for it. This only gates
/// an external client-credentials token. GET requires the area's ":read"
/// scope, any other verb requires ":write".
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public class RequireScopeAttribute(string area) : Attribute, IAuthorizationFilter
{
    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (!user.IsScopedClient()) return;

        var required = HttpMethods.IsGet(context.HttpContext.Request.Method)
            ? ApiScopes.Read(area)
            : ApiScopes.Write(area);

        if (!user.GetScopes().Contains(required))
        {
            context.Result = new ObjectResult(new ProblemDetails
            {
                Title = "Insufficient scope",
                Detail = $"This client token is missing the '{required}' scope.",
                Status = StatusCodes.Status403Forbidden,
            })
            { StatusCode = StatusCodes.Status403Forbidden };
        }
    }
}
