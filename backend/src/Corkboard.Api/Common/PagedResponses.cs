using System.ComponentModel.DataAnnotations;
using Corkboard.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace Corkboard.Api.Common;

/// <summary>
/// The paging query params every list endpoint takes: <c>page</c> (1-based) and <c>pageSize</c>
/// (1–50, default 50). Bound with [FromQuery]; [ApiController] answers out-of-range values with a 400.
/// </summary>
public sealed class PageQuery
{
    [Range(1, PageRequest.MaxPage)]
    public int Page { get; init; } = PageRequest.FirstPage;

    [Range(1, PageRequest.MaxPageSize)]
    public int PageSize { get; init; } = PageRequest.DefaultPageSize;

    public PageRequest ToRequest() => new(Page, PageSize);
}

public static class PagedResponses
{
    public const string TotalCountHeader = "X-Total-Count";

    /// <summary>200 with the page's items as a plain array and the overall match count in <c>X-Total-Count</c>.</summary>
    public static ActionResult<IReadOnlyList<T>> PagedOk<T>(this ControllerBase controller, PagedResult<T> page)
    {
        controller.Response.Headers[TotalCountHeader] = page.TotalCount.ToString(System.Globalization.CultureInfo.InvariantCulture);
        return controller.Ok(page.Items);
    }

    /// <summary>Same, slicing an already-materialised list.</summary>
    public static ActionResult<IReadOnlyList<T>> PagedOk<T>(this ControllerBase controller, IReadOnlyList<T> all, PageQuery paging) =>
        controller.PagedOk(all.ToPage(paging.ToRequest()));
}
