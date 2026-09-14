namespace Corkboard.Domain.Entities;

/// <summary>
/// A container of Nodes, optionally nested under a parent Collection. Backend-only
/// concept — never named "Collection" to the user; see <see cref="CollectionType"/>
/// for the user-facing framing (e.g. "Task list").
/// </summary>
public class Collection
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public required string Name { get; set; }
    public CollectionType Type { get; set; }

    /// <summary>Null for a top-level Collection.</summary>
    public Guid? ParentCollectionId { get; set; }
    public Collection? ParentCollection { get; set; }
    public List<Collection> ChildCollections { get; set; } = [];

    public List<Node> Nodes { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
}
