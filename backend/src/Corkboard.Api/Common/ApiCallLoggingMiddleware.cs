using System.Diagnostics;
using Corkboard.Domain.Entities;

namespace Corkboard.Api.Common;

/// <summary>
/// Records one ApiCallLog row per request tied to a registered ApiClient — both
/// the Angular GUI's own first-party client (every logged-in family member's
/// traffic) and an external client-credentials caller; a request with no
/// client identity at all (e.g. anonymous) is left alone. The row is only
/// queued here; ApiCallLogWriter persists it in the background. See
/// ApiCallLogCleanupJob for the 48h retention purge. Registered after
/// UseAuthentication()/UseAuthorization() in Program.cs so HttpContext.User is
/// populated by the time this runs.
/// </summary>
public class ApiCallLoggingMiddleware(RequestDelegate next, ApiCallLogWriter writer)
{
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        await next(context);
        stopwatch.Stop();

        var clientId = context.User.GetApiClientId();
        if (clientId is null) return;

        writer.Enqueue(new ApiCallLog
        {
            ApiClientId = clientId.Value,
            Method = context.Request.Method,
            Path = context.Request.Path.Value ?? string.Empty,
            StatusCode = context.Response.StatusCode,
            DurationMs = stopwatch.ElapsedMilliseconds,
            Timestamp = DateTimeOffset.UtcNow,
        });
    }
}
