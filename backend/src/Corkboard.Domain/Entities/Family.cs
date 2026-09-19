namespace Corkboard.Domain.Entities;

public class Family
{
    public Guid Id { get; set; }
    public required string Name { get; set; }

    /// <summary>IANA time zone id (e.g. "Europe/Amsterdam"), drives TickerQ scheduling and "today" boundaries.</summary>
    public required string TimeZone { get; set; }

    public DateTimeOffset CreatedAt { get; set; }

    public List<FamilyMember> Members { get; set; } = [];
    public List<UserFamily> UserFamilies { get; set; } = [];
}
