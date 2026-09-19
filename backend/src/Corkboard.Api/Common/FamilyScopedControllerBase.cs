using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Common;

/// <summary>Base for controllers whose every action operates within the caller's Family.</summary>
[Authorize]
public abstract class FamilyScopedControllerBase : ControllerBase
{
    /// <summary>
    /// The caller's Family id from their JWT, or null if they haven't set one up
    /// yet (see POST /api/families). Actions should return the result of
    /// <see cref="NoFamilyProblem"/> when this is null.
    /// </summary>
    protected Guid? CurrentFamilyId => User.GetFamilyId();

    protected Guid CurrentUserId => User.GetUserId();

    protected bool CurrentUserIsOwner => User.GetFamilyRole() == nameof(Domain.Entities.FamilyRole.Owner);

    /// <summary>Owner or Adult — who's allowed to manage the shared Family dashboard (see DashboardController).</summary>
    protected bool CurrentUserIsAdmin => User.GetFamilyRole() is nameof(Domain.Entities.FamilyRole.Owner) or nameof(Domain.Entities.FamilyRole.Adult);

    protected ObjectResult NoFamilyProblem() => Problem(
        title: "No family set up yet",
        detail: "Call POST /api/families first, then use the token it returns.",
        statusCode: StatusCodes.Status409Conflict);
}
