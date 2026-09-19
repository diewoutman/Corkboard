namespace Corkboard.Domain.Entities;

public class ContactPhoneNumber
{
    public Guid Id { get; set; }

    public Guid ContactId { get; set; }
    public Contact Contact { get; set; } = null!;

    public required string Number { get; set; }

    /// <summary>Free-text, e.g. "Mobile", "Home", "Work".</summary>
    public string? Label { get; set; }
}
