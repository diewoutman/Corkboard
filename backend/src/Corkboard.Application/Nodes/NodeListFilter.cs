using Corkboard.Application.Common;
using Corkboard.Contracts.Collections;
using Corkboard.Contracts.Nodes;

namespace Corkboard.Application.Nodes;

/// <summary>
/// The query params NodesController.List accepts. Everything after <paramref name="Until"/> is optional.
/// </summary>
/// <param name="IsCompleted">Tasks only — implicitly excludes every other node type.</param>
/// <param name="Scope">Family or Personal, by the scope of the containing Collection (nodes without a Collection count as Family).</param>
/// <param name="SectionId">Tasks only.</param>
/// <param name="Priority">Tasks only, exact match.</param>
/// <param name="Search">Case-insensitive substring of the title or description.</param>
/// <param name="DueFrom">Only nodes whose <c>Until</c> is set and on or after this (nodes without a due date never match).</param>
/// <param name="DueUntil">Only nodes whose <c>Until</c> is set and strictly before this — overdue ones included.</param>
/// <param name="IsImportant">Notes only.</param>
/// <param name="Sort">One of <see cref="NodeSortKeys.All"/>, prefixed with "-" for descending.</param>
public sealed record NodeListFilter(
    NodeType? Type,
    Guid? AssignedTo,
    Guid? CollectionId,
    DateTimeOffset? From,
    DateTimeOffset? Until,
    bool? IsCompleted = null,
    CollectionScope? Scope = null,
    Guid? SectionId = null,
    int? Priority = null,
    string? Search = null,
    string? Sort = null,
    PageRequest? Paging = null,
    DateTimeOffset? DueFrom = null,
    DateTimeOffset? DueUntil = null,
    bool? IsImportant = null);

public static class NodeSortKeys
{
    /// <summary>
    /// "due" is Until, falling back to CreatedAt for nodes without a due date; "important" (Notes) sorts by
    /// IsImportant and then newest first; "name" (Contacts) is last name, then first name.
    /// </summary>
    public static readonly string[] All = ["createdAt", "updatedAt", "title", "due", "until", "priority", "important", "name"];

    public static bool IsValid(string? sort) => sort is null || All.Contains(sort.TrimStart('-'), StringComparer.OrdinalIgnoreCase);
}
