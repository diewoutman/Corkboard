namespace Corkboard.Domain.Entities;

/// <summary>
/// Rolling 48h audit trail of requests made by an ApiClient — see
/// ApiCallLogCleanupJob for the retention purge. Uses a bigint identity Id rather
/// than this codebase's usual Guid, deliberately: this is high-volume, append-only,
/// time-ordered data with nothing else referencing it by id.
/// </summary>
public class ApiCallLog
{
    public long Id { get; set; }

    public Guid ApiClientId { get; set; }
    public ApiClient ApiClient { get; set; } = null!;

    public required string Method { get; set; }
    public required string Path { get; set; }
    public int StatusCode { get; set; }
    public long DurationMs { get; set; }
    public DateTimeOffset Timestamp { get; set; }
}
