namespace Corkboard.Domain.Entities;

public class ContactEmail
{
    public Guid Id { get; set; }

    public Guid ContactId { get; set; }
    public Contact Contact { get; set; } = null!;

    public required string Email { get; set; }

    /// <summary>Free-text, e.g. "Personal", "Work".</summary>
    public string? Label { get; set; }
}
