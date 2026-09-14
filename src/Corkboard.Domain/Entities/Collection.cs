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

    /// <summary>Color-coding, e.g. a hex string — same idea as FamilyMember.Color.</summary>
    public required string Color { get; set; }

    /// <summary>
    /// Opaque token authenticating anonymous iCal feed requests (calendar apps
    /// can't do an interactive JWT login) — see CalendarFeedController. Null
    /// until the feed URL is first requested; only meaningful for a Calendar.
    /// </summary>
    public string? FeedToken { get; set; }

    /// <summary>
    /// Shared address, only meaningful for a Household — its member Contacts fall
    /// back to this when they don't set their own address (see Contact.Street etc).
    /// </summary>
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    /// <summary>Null for a top-level Collection.</summary>
    public Guid? ParentCollectionId { get; set; }
    public Collection? ParentCollection { get; set; }
    public List<Collection> ChildCollections { get; set; } = [];

    public List<Node> Nodes { get; set; } = [];

    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public Guid CreatedByUserId { get; set; }
}
