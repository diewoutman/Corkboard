using System.Diagnostics;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Common;

/// <summary>
/// Writes one ApiCallLog row per request tied to a registered ApiClient — both
/// the Angular GUI's own first-party client (every logged-in family member's
/// traffic) and an external client-credentials caller; a request with no
/// client identity at all (e.g. anonymous) is left alone. See
/// ApiCallLogCleanupJob for the 48h retention purge. Registered after
/// UseAuthentication()/UseAuthorization() in Program.cs so HttpContext.User is
/// populated by the time this runs.
/// </summary>
public class ApiCallLoggingMiddleware(RequestDelegate next, ILogger<ApiCallLoggingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context, CorkboardDbContext db)
    {
        var stopwatch = Stopwatch.StartNew();
        await next(context);
        stopwatch.Stop();

        var clientId = context.User.GetApiClientId();
        if (clientId is null) return;

        try
        {
            db.ApiCallLogs.Add(new ApiCallLog
            {
                ApiClientId = clientId.Value,
                Method = context.Request.Method,
                Path = context.Request.Path.Value ?? string.Empty,
                StatusCode = context.Response.StatusCode,
                DurationMs = stopwatch.ElapsedMilliseconds,
                Timestamp = DateTimeOffset.UtcNow,
            });

            var client = await db.ApiClients.FirstOrDefaultAsync(c => c.Id == clientId);
            if (client is not null) client.LastUsedAt = DateTimeOffset.UtcNow;

            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            // A logging failure must never take down the actual response, which has
            // already been written by this point.
            logger.LogError(ex, "Failed to write ApiCallLog for client {ClientId}", clientId);
        }
    }
}
