namespace Corkboard.Domain.Entities;

/// <summary>
/// A Collection's optional address — currently only meaningful for a Household,
/// but kept in its own one-to-one table rather than as columns on Collection
/// itself, so future per-CollectionType "features" don't keep widening that table.
/// </summary>
public class CollectionAddress
{
    /// <summary>Also the FK — one-to-one with Collection.</summary>
    public Guid CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;

    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
}
