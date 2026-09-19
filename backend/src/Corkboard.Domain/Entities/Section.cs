namespace Corkboard.Domain.Entities;

/// <summary>
/// A Todoist-style category inside a Collection (e.g. "Produce" in a shopping
/// list). One level deep — Tasks point at it via <see cref="TaskNode.SectionId"/>.
/// </summary>
public class Section
{
    public Guid Id { get; set; }

    public Guid CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;

    public required string Name { get; set; }
    public int SortOrder { get; set; }
}
