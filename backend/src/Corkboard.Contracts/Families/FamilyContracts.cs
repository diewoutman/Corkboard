using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.Families;

/// <summary>
/// Creates the caller's Family and, in the same call, the FamilyMember that
/// represents them in it (they become its Owner). See §8 in CONCEPT.md —
/// this is the "Family setup, seeded on first run" MVP flow.
/// </summary>
public record CreateFamilyRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Name,
    [Required, StringLength(100, MinimumLength = 1)] string TimeZone,
    [Required, StringLength(100, MinimumLength = 1)] string OwnerDisplayName,
    [Required, StringLength(20)] string OwnerColor);

public record FamilyResponse(
    Guid Id,
    string Name,
    string TimeZone,
    DateTimeOffset CreatedAt);

public record UpdateFamilyRequest(
    [Required, StringLength(200, MinimumLength = 1)] string Name,
    [Required, StringLength(100, MinimumLength = 1)] string TimeZone);
