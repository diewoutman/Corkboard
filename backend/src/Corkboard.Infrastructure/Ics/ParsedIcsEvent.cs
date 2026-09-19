namespace Corkboard.Infrastructure.Ics;

public record ParsedIcsEvent(
    string Title,
    string? Description,
    string? Location,
    DateTimeOffset From,
    DateTimeOffset? Until,
    bool AllDay,
    string? RecurrenceRule);
