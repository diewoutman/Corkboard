using Corkboard.Application.Notifications;

namespace Corkboard.Api.Jobs;

/// <summary>Once a minute, sends whichever Web Push reminders have become due (see <see cref="ReminderService"/>).</summary>
public class ReminderWorker(IServiceScopeFactory scopeFactory, Microsoft.Extensions.Options.IOptions<PushOptions> options, ILogger<ReminderWorker> logger)
    : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!options.Value.Enabled)
        {
            logger.LogInformation("Push:PublicKey/PrivateKey are not set — Web Push reminders are disabled.");
            return;
        }

        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        do
        {
            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                await scope.ServiceProvider.GetRequiredService<ReminderService>().SendDueRemindersAsync(DateTimeOffset.UtcNow, stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                // One bad run must not stop the loop; the next tick retries whatever is still due.
                logger.LogError(ex, "Sending reminders failed");
            }
        }
        while (await timer.WaitForNextTickAsync(stoppingToken));
    }
}
