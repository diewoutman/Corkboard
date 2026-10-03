namespace Corkboard.Domain.Entities;

/// <summary>A lightweight, append-only record of something meaningful that happened in a family.</summary>
public class Activity
{
    public Guid Id { get; set; }
    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;
    public Guid ActorUserId { get; set; }
    public required string Action { get; set; }
    public required string SubjectType { get; set; }
    public Guid SubjectId { get; set; }
    public required string SubjectTitle { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}
