using System.ComponentModel.DataAnnotations;

namespace Corkboard.Contracts.Notifications;

/// <summary>Whether the server can send Web Push at all (VAPID keys configured) and the public key the browser needs to subscribe.</summary>
public record PushConfigResponse(bool Enabled, string? PublicKey);

public record SubscribePushRequest(
    [Required, Url, StringLength(2048)] string Endpoint,
    [Required, StringLength(200)] string P256dh,
    [Required, StringLength(100)] string Auth,
    [Range(0, 7 * 24 * 60)] int LeadMinutes,
    [StringLength(500)] string? UserAgent);

public record PushSubscriptionResponse(Guid Id, string Endpoint, int LeadMinutes, string? UserAgent, DateTimeOffset CreatedAt);
