using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using TickerQ.Utilities.Base;

namespace Corkboard.Api.Jobs;

/// <summary>
/// Purges ApiCallLog rows older than the 48h retention window. The
/// [TickerFunction] attribute's cronExpression is enough on its own — TickerQ
/// auto-seeds this as a recurring job at startup, no manual scheduling call needed.
/// </summary>
public class ApiCallLogCleanupJob(CorkboardDbContext db)
{
    [TickerFunction(functionName: "PurgeExpiredApiCallLogs", cronExpression: "*/30 * * * *")]
    public async Task PurgeAsync(TickerFunctionContext context, CancellationToken cancellationToken)
    {
        var cutoff = DateTimeOffset.UtcNow.AddHours(-48);
        await db.ApiCallLogs.Where(l => l.Timestamp < cutoff).ExecuteDeleteAsync(cancellationToken);
    }
}
