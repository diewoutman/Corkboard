namespace Corkboard.Contracts.Families;

/// <summary>
/// Creates the caller's Family and, in the same call, the FamilyMember that
/// represents them in it (they become its Owner). See §8 in CONCEPT.md —
/// this is the "Family setup, seeded on first run" MVP flow.
/// </summary>
public record CreateFamilyRequest(
    string Name,
    string TimeZone,
    string OwnerDisplayName,
    string OwnerColor);

public record FamilyResponse(
    Guid Id,
    string Name,
    string TimeZone,
    DateTimeOffset CreatedAt);

public record UpdateFamilyRequest(string Name, string TimeZone);
