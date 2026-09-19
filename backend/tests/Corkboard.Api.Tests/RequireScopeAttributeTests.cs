using System.Security.Claims;
using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Abstractions;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.Routing;

namespace Corkboard.Api.Tests;

public class RequireScopeAttributeTests
{
    private static AuthorizationFilterContext CreateContext(ClaimsPrincipal user, string method)
    {
        var httpContext = new DefaultHttpContext { User = user };
        httpContext.Request.Method = method;

        var actionContext = new ActionContext(httpContext, new RouteData(), new ActionDescriptor());
        return new AuthorizationFilterContext(actionContext, []);
    }

    private static ClaimsPrincipal ClientPrincipal(params string[] scopes)
    {
        var claims = new List<Claim>
        {
            new(CorkboardClaimTypes.ClientId, "some-client"),
            new(CorkboardClaimTypes.Scope, string.Join(' ', scopes)),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static ClaimsPrincipal HumanPrincipal() =>
        new(new ClaimsIdentity([new Claim(CorkboardClaimTypes.FamilyRole, "Member")], "Test"));

    /// <summary>The Angular GUI's own token (see TokenService.CreateTokenAsync) — has a ClientId claim but never a Scope claim.</summary>
    private static ClaimsPrincipal FirstPartyGuiPrincipal() => new(new ClaimsIdentity(
        [
            new Claim(CorkboardClaimTypes.FamilyRole, "Member"),
            new Claim(CorkboardClaimTypes.ClientId, Guid.NewGuid().ToString()),
        ],
        "Test"));

    [Fact]
    public void GET_without_the_read_scope_is_forbidden()
    {
        var attribute = new RequireScopeAttribute("nodes");
        var context = CreateContext(ClientPrincipal(), "GET");

        attribute.OnAuthorization(context);

        var result = Assert.IsType<ObjectResult>(context.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, result.StatusCode);
    }

    [Fact]
    public void GET_with_the_read_scope_passes()
    {
        var attribute = new RequireScopeAttribute("nodes");
        var context = CreateContext(ClientPrincipal("nodes:read"), "GET");

        attribute.OnAuthorization(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public void POST_requires_the_write_scope_not_the_read_scope()
    {
        var attribute = new RequireScopeAttribute("nodes");
        var context = CreateContext(ClientPrincipal("nodes:read"), "POST");

        attribute.OnAuthorization(context);

        Assert.NotNull(context.Result);
    }

    [Fact]
    public void A_human_family_token_always_passes_regardless_of_scope()
    {
        var attribute = new RequireScopeAttribute("nodes");
        var context = CreateContext(HumanPrincipal(), "POST");

        attribute.OnAuthorization(context);

        Assert.Null(context.Result);
    }

    [Fact]
    public void The_GUIs_own_first_party_token_always_passes_despite_carrying_a_ClientId_claim()
    {
        var attribute = new RequireScopeAttribute("nodes");
        var context = CreateContext(FirstPartyGuiPrincipal(), "POST");

        attribute.OnAuthorization(context);

        Assert.Null(context.Result);
    }
}
