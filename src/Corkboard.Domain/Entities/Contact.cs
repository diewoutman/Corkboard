namespace Corkboard.Domain.Entities;

/// <summary>
/// An entry in the family's address book. Title (from Node) mirrors "FirstName
/// LastName" — kept in sync server-side, not user-edited directly.
/// </summary>
public class Contact : Node
{
    public required string FirstName { get; set; }
    public required string LastName { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    /// <summary>
    /// Own address — optional. When null and this Contact belongs to a Household
    /// (see CollectionId), the client falls back to the Household's address.
    /// </summary>
    public string? Street { get; set; }
    public string? City { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }

    /// <summary>At least one is required — enforced by NodesController, not the DB.</summary>
    public List<ContactPhoneNumber> PhoneNumbers { get; set; } = [];

    public List<ContactEmail> Emails { get; set; } = [];
}
