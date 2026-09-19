namespace Corkboard.Application.Notifications;

/// <summary>
/// The "Push" configuration section. Web Push is off until both VAPID keys are set —
/// generate a pair once (e.g. <c>npx web-push generate-vapid-keys</c>) and keep the private key secret.
/// </summary>
public class PushOptions
{
    public const string SectionName = "Push";

    /// <summary>A mailto: or https: contact the push services can reach if your server misbehaves.</summary>
    public string Subject { get; set; } = "mailto:admin@localhost";
    public string? PublicKey { get; set; }
    public string? PrivateKey { get; set; }

    public bool Enabled => !string.IsNullOrWhiteSpace(PublicKey) && !string.IsNullOrWhiteSpace(PrivateKey);
}
