namespace Corkboard.Contracts.Admin;

public record AdminStatsResponse(
    int FamilyCount,
    int UserCount,
    int ApiClientCount,
    int ActiveApiClientCount,
    int FamilyMemberCount,
    int NodeCount);

public record AdminFamilySummaryResponse(
    Guid Id,
    string Name,
    string TimeZone,
    DateTimeOffset CreatedAt,
    int MemberCount,
    int NodeCount);
