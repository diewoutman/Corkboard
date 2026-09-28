namespace Corkboard.Contracts.Activity;

public record ActivityResponse(
    Guid Id,
    string ActorName,
    string Action,
    string SubjectType,
    Guid SubjectId,
    string SubjectTitle,
    DateTimeOffset CreatedAt);
