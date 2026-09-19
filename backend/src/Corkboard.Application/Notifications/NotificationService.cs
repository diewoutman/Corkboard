using System.Net;
using System.Net.Sockets;
using Corkboard.Application.Common;
using Corkboard.Contracts.Notifications;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Corkboard.Application.Notifications;

/// <summary>Manages the caller's own push subscriptions (one per device) and exposes the public VAPID key.</summary>
public class NotificationService(CorkboardDbContext db, IOptions<PushOptions> options)
{
    public PushConfigResponse GetConfig() =>
        options.Value.Enabled ? new PushConfigResponse(true, options.Value.PublicKey) : new PushConfigResponse(false, null);

    public async Task<IReadOnlyList<PushSubscriptionResponse>> ListAsync(Guid userId, CancellationToken cancellationToken) =>
        await db.PushSubscriptions
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.CreatedAt)
            .Select(p => new PushSubscriptionResponse(p.Id, p.Endpoint, p.LeadMinutes, p.UserAgent, p.CreatedAt))
            .ToListAsync(cancellationToken);

    /// <summary>Registers this device, or updates its lead time / owner if the browser re-subscribes with the same endpoint.</summary>
    public async Task<Result<PushSubscriptionResponse>> SubscribeAsync(Guid userId, SubscribePushRequest request, CancellationToken cancellationToken)
    {
        if (!options.Value.Enabled)
        {
            return Result<PushSubscriptionResponse>.Failure(Error.BadRequest("Push is not enabled", "This server has no VAPID keys configured."));
        }

        // The server will POST to this URL, so never let it point at the server's own network.
        if (!IsAcceptableEndpoint(request.Endpoint))
        {
            return Result<PushSubscriptionResponse>.Failure(Error.BadRequest("Invalid endpoint", "Endpoint must be a public https URL."));
        }

        var now = DateTimeOffset.UtcNow;
        var subscription = await db.PushSubscriptions.FirstOrDefaultAsync(p => p.Endpoint == request.Endpoint, cancellationToken);
        if (subscription is null)
        {
            subscription = new PushSubscription
            {
                Id = Guid.NewGuid(),
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                CreatedAt = now,
            };
            db.PushSubscriptions.Add(subscription);
        }

        subscription.UserId = userId;
        subscription.P256dh = request.P256dh;
        subscription.Auth = request.Auth;
        subscription.LeadMinutes = request.LeadMinutes;
        subscription.UserAgent = request.UserAgent;
        subscription.LastSeenAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return Result<PushSubscriptionResponse>.Success(
            new PushSubscriptionResponse(subscription.Id, subscription.Endpoint, subscription.LeadMinutes, subscription.UserAgent, subscription.CreatedAt));
    }

    public async Task<Result> UnsubscribeAsync(Guid userId, string endpoint, CancellationToken cancellationToken)
    {
        var subscription = await db.PushSubscriptions.FirstOrDefaultAsync(p => p.UserId == userId && p.Endpoint == endpoint, cancellationToken);
        if (subscription is null) return Result.Failure(Error.NotFound());

        db.PushSubscriptions.Remove(subscription);
        await db.SaveChangesAsync(cancellationToken);
        return Result.Success();
    }

    /// <summary>https only, no localhost and no literal private/loopback/link-local addresses.</summary>
    public static bool IsAcceptableEndpoint(string endpoint)
    {
        if (!Uri.TryCreate(endpoint, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps) return false;
        if (uri.IsLoopback || uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) || !uri.Host.Contains('.') && !IPAddress.TryParse(uri.Host, out _)) return false;

        if (!IPAddress.TryParse(uri.Host.Trim('[', ']'), out var ip)) return true;
        if (IPAddress.IsLoopback(ip) || ip.IsIPv6LinkLocal || ip.IsIPv6SiteLocal || ip.IsIPv6UniqueLocal) return false;
        if (ip.AddressFamily != AddressFamily.InterNetwork) return true;

        var b = ip.GetAddressBytes();
        return !(b[0] is 10 or 0 or 127 || b[0] == 169 && b[1] == 254 || b[0] == 172 && b[1] is >= 16 and <= 31 || b[0] == 192 && b[1] == 168);
    }
}
