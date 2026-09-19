using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Common;

/// <summary>Which page of a list endpoint to return. Every list endpoint is paged; there is no "give me everything".</summary>
public sealed record PageRequest(int Page = PageRequest.FirstPage, int PageSize = PageRequest.DefaultPageSize)
{
    public const int FirstPage = 1;
    public const int DefaultPageSize = 50;
    public const int MaxPageSize = 50;
    public const int MaxPage = 1_000_000;

    public static PageRequest Default { get; } = new();

    public int Skip => (Math.Clamp(Page, 1, MaxPage) - 1) * Math.Clamp(PageSize, 1, MaxPageSize);
    public int Take => Math.Clamp(PageSize, 1, MaxPageSize);
}

/// <summary>One page of items plus how many matched in total (before paging).</summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount);

public static class PagingExtensions
{
    /// <summary>Counts, then fetches just the requested page. The query must already be ordered (ideally ending on a unique key).</summary>
    public static async Task<PagedResult<T>> ToPagedAsync<T>(this IQueryable<T> query, PageRequest page, CancellationToken cancellationToken)
    {
        var total = await query.CountAsync(cancellationToken);
        var items = await query.Skip(page.Skip).Take(page.Take).ToListAsync(cancellationToken);
        return new PagedResult<T>(items, total);
    }

    /// <summary>For results that are computed in memory (e.g. expanded recurrences) or are inherently small.</summary>
    public static PagedResult<T> ToPage<T>(this IReadOnlyList<T> all, PageRequest page) =>
        new(all.Skip(page.Skip).Take(page.Take).ToList(), all.Count);
}
