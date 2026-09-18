using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Common;

/// <summary>Base for controllers whose actions are gated by the instance-level system-owner flag, not a Family role.</summary>
[Authorize]
public abstract class SystemOwnerControllerBase : ControllerBase
{
    protected Guid CurrentUserId => User.GetUserId();

    protected bool CurrentUserIsSystemOwner => User.IsSystemOwner();

    protected ObjectResult SystemOwnerOnlyProblem() => Problem(
        title: "System owner only",
        statusCode: StatusCodes.Status403Forbidden);
}
