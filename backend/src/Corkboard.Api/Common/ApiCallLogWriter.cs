using System.Threading.Channels;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Common;

/// <summary>
/// Buffers ApiCallLog rows in memory and writes them in batches from a background loop, so a request never
/// waits on (or holds its connection open for) the logging round-trips — noticeable on slow hosting.
/// ApiClient.LastUsedAt is refreshed once per batch per client instead of once per request.
/// </summary>
public class ApiCallLogWriter(IServiceScopeFactory scopeFactory, ILogger<ApiCallLogWriter> logger) : BackgroundService
{
    private const int MaxBatch = 200;
    private static readonly TimeSpan FlushInterval = TimeSpan.FromSeconds(2);

    // Bounded so a stalled database can't grow memory without limit; the oldest entries are dropped first.
    private readonly Channel<ApiCallLog> channel = Channel.CreateBounded<ApiCallLog>(
        new BoundedChannelOptions(5000) { FullMode = BoundedChannelFullMode.DropOldest, SingleReader = true });

    public void Enqueue(ApiCallLog entry) => channel.Writer.TryWrite(entry);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var batch = new List<ApiCallLog>(MaxBatch);
        try
        {
            while (await channel.Reader.WaitToReadAsync(stoppingToken))
            {
                await Task.Delay(FlushInterval, stoppingToken);
                while (batch.Count < MaxBatch && channel.Reader.TryRead(out var entry)) batch.Add(entry);
                await FlushAsync(batch, CancellationToken.None);
                batch.Clear();
            }
        }
        catch (OperationCanceledException)
        {
            // Shutting down: write whatever is still buffered.
            while (channel.Reader.TryRead(out var entry)) batch.Add(entry);
            await FlushAsync(batch, CancellationToken.None);
        }
    }

    private async Task FlushAsync(List<ApiCallLog> batch, CancellationToken cancellationToken)
    {
        if (batch.Count == 0) return;

        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<CorkboardDbContext>();
            db.ApiCallLogs.AddRange(batch);
            await db.SaveChangesAsync(cancellationToken);

            foreach (var group in batch.GroupBy(e => e.ApiClientId))
            {
                var lastUsed = group.Max(e => e.Timestamp);
                var clientId = group.Key;
                await db.ApiClients.Where(c => c.Id == clientId)
                    .ExecuteUpdateAsync(s => s.SetProperty(c => c.LastUsedAt, lastUsed), cancellationToken);
            }
        }
        catch (Exception ex)
        {
            // A logging failure must never affect the app itself.
            logger.LogError(ex, "Failed to write {Count} ApiCallLog rows", batch.Count);
        }
    }
}
