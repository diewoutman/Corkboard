using System.Collections.Concurrent;

namespace Corkboard.Api.Common;

/// <summary>
/// Makes POSTs safe to repeat: a client sends an Idempotency-Key header (a fresh GUID per user action) and a second
/// request with the same key — a double click, a retry after a slow response — gets the first request's response
/// back instead of creating a second row. A concurrent duplicate waits for the first to finish. Only successful
/// (2xx) responses are remembered, so a failed attempt can simply be retried. Kept in memory for a few minutes:
/// enough for double submits and retries, and this app runs as a single instance.
/// </summary>
public class IdempotencyMiddleware(RequestDelegate next)
{
    public const string HeaderName = "Idempotency-Key";
    private static readonly TimeSpan Retention = TimeSpan.FromMinutes(10);
    private const int MaxKeyLength = 100;

    private sealed record Stored(int StatusCode, string? ContentType, byte[] Body, DateTimeOffset ExpiresAt);

    private static readonly ConcurrentDictionary<string, TaskCompletionSource<Stored?>> Entries = new();

    public async Task InvokeAsync(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method)
            || context.User.Identity?.IsAuthenticated != true
            || context.Request.Headers[HeaderName].ToString() is not { Length: > 0 and <= MaxKeyLength } key)
        {
            await next(context);
            return;
        }

        Sweep();
        var entryKey = $"{context.User.GetUserId()}|{context.Request.Path}|{key}";
        var candidate = new TaskCompletionSource<Stored?>(TaskCreationOptions.RunContinuationsAsynchronously);
        var entry = Entries.GetOrAdd(entryKey, candidate);
        var created = ReferenceEquals(entry, candidate);

        if (!created)
        {
            var stored = await entry.Task.WaitAsync(context.RequestAborted);
            if (stored is not null)
            {
                context.Response.StatusCode = stored.StatusCode;
                context.Response.ContentType = stored.ContentType;
                context.Response.Headers["Idempotent-Replayed"] = "true";
                await context.Response.Body.WriteAsync(stored.Body, context.RequestAborted);
                return;
            }

            // The first attempt failed (not remembered) — fall through and handle this one for real.
            await next(context);
            return;
        }

        var original = context.Response.Body;
        await using var buffer = new MemoryStream();
        context.Response.Body = buffer;
        try
        {
            await next(context);

            buffer.Position = 0;
            await buffer.CopyToAsync(original, context.RequestAborted);

            if (context.Response.StatusCode is >= 200 and < 300)
            {
                entry.TrySetResult(new Stored(context.Response.StatusCode, context.Response.ContentType, buffer.ToArray(), DateTimeOffset.UtcNow + Retention));
            }
            else
            {
                Forget(entryKey, entry);
            }
        }
        catch
        {
            Forget(entryKey, entry);
            throw;
        }
        finally
        {
            context.Response.Body = original;
        }
    }

    private static void Forget(string entryKey, TaskCompletionSource<Stored?> entry)
    {
        Entries.TryRemove(entryKey, out _);
        entry.TrySetResult(null);
    }

    private static void Sweep()
    {
        if (Entries.Count < 200) return;
        var now = DateTimeOffset.UtcNow;
        foreach (var (k, v) in Entries)
        {
            if (v.Task is { IsCompletedSuccessfully: true, Result: { } stored } && stored.ExpiresAt < now) Entries.TryRemove(k, out _);
        }
    }
}
