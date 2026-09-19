using System.Text.Json;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Application.Notifications;

/// <summary>
/// Sends the Web Push reminders that have become due. Runs every minute (see the
/// ReminderWorker in the API project); a <see cref="SentReminder"/> row per device and
/// occurrence keeps a restart or an overlapping run from notifying twice, and a
/// recurring item is simply reminded once per occurrence — nothing is scheduled ahead.
///
/// What is reminded, and when:
/// - a task with a due time / an appointment: <c>LeadMinutes</c> before it (per device);
/// - a task or all-day appointment with only a date: at <see cref="DateOnlyReminderHour"/>
///   local time on that day (there is no time to count back from).
///
/// Who: a Personal list's owner; otherwise the assigned members that have a login; an item
/// nobody is assigned to goes to the whole family. Falling back to "the whole family" for
/// unassigned Family items is a product choice — see <see cref="Recipients"/>.
///
/// A reminder more than <see cref="Grace"/> overdue is dropped instead of sent late (e.g. after
/// the server was down, or when a device subscribes after the moment has passed).
/// </summary>
public class ReminderService(CorkboardDbContext db, RecurrenceExpansionService recurrence, IPushSender sender)
{
    public const int DateOnlyReminderHour = 9;
    public static readonly TimeSpan Grace = TimeSpan.FromMinutes(30);

    /// <summary>Returns how many notifications were sent.</summary>
    public async Task<int> SendDueRemindersAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        db.SentReminders.RemoveRange(await db.SentReminders.Where(r => r.OccurrenceStart < now.AddDays(-7)).ToListAsync(cancellationToken));

        var subscriptions = await db.PushSubscriptions.ToListAsync(cancellationToken);
        if (subscriptions.Count == 0) return 0;

        var maxLead = TimeSpan.FromMinutes(subscriptions.Max(s => s.LeadMinutes));
        var windowStart = now.AddDays(-1);
        var windowEnd = now + maxLead + TimeSpan.FromDays(1);

        var occurrences = await LoadOccurrencesAsync(windowStart, windowEnd, cancellationToken);
        if (occurrences.Count == 0) return 0;

        var familyIds = occurrences.Select(o => o.FamilyId).Distinct().ToList();
        var timeZones = await db.Families.Where(f => familyIds.Contains(f.Id)).ToDictionaryAsync(f => f.Id, f => f.TimeZone, cancellationToken);
        var familyUsers = (await db.UserFamilies.Where(u => familyIds.Contains(u.FamilyId)).Select(u => new { u.FamilyId, u.UserId }).ToListAsync(cancellationToken))
            .GroupBy(u => u.FamilyId).ToDictionary(g => g.Key, g => g.Select(u => u.UserId).ToList());
        var linkedUsers = await db.FamilyMembers.Where(m => m.LinkedUserId != null)
            .ToDictionaryAsync(m => m.Id, m => m.LinkedUserId!.Value, cancellationToken);
        var languages = await db.Users.Where(u => u.Language != null).ToDictionaryAsync(u => u.Id, u => u.Language!, cancellationToken);
        var alreadySent = (await db.SentReminders.Where(r => r.OccurrenceStart >= windowStart).Select(r => new { r.PushSubscriptionId, r.NodeId, r.OccurrenceStart }).ToListAsync(cancellationToken))
            .Select(r => (r.PushSubscriptionId, r.NodeId, r.OccurrenceStart)).ToHashSet();

        var sent = 0;
        var gone = new List<PushSubscription>();

        foreach (var occurrence in occurrences)
        {
            var zone = ResolveTimeZone(timeZones.GetValueOrDefault(occurrence.FamilyId));
            var recipients = Recipients(occurrence, familyUsers.GetValueOrDefault(occurrence.FamilyId, []), linkedUsers);

            foreach (var subscription in subscriptions.Where(s => recipients.Contains(s.UserId) && !gone.Contains(s)))
            {
                var fireAt = FireTime(occurrence, subscription.LeadMinutes, zone);
                if (fireAt > now || fireAt < now - Grace) continue;
                if (alreadySent.Contains((subscription.Id, occurrence.NodeId, occurrence.Start))) continue;

                var language = languages.GetValueOrDefault(subscription.UserId, "en");
                var result = await sender.SendAsync(subscription, BuildPayload(occurrence, zone, language), cancellationToken);

                if (result == PushResult.Sent)
                {
                    db.SentReminders.Add(new SentReminder
                    {
                        PushSubscriptionId = subscription.Id, NodeId = occurrence.NodeId, OccurrenceStart = occurrence.Start, SentAt = now,
                    });
                    alreadySent.Add((subscription.Id, occurrence.NodeId, occurrence.Start));
                    sent++;
                }
                else if (result == PushResult.Gone)
                {
                    gone.Add(subscription);
                }
            }
        }

        db.PushSubscriptions.RemoveRange(gone);
        await db.SaveChangesAsync(cancellationToken);
        return sent;
    }

    private sealed record Occurrence(
        Guid NodeId, Guid FamilyId, string Title, DateTimeOffset Start, bool IsDateOnly, bool IsTask,
        Guid? CollectionId, Guid? PersonalOwnerId, IReadOnlyList<Guid> AssignedMemberIds);

    private async Task<List<Occurrence>> LoadOccurrencesAsync(DateTimeOffset windowStart, DateTimeOffset windowEnd, CancellationToken cancellationToken)
    {
        var result = new List<Occurrence>();

        var tasks = await db.TaskNodes.AsNoTracking()
            .Include(t => t.Assignments).Include(t => t.Collection)
            .Where(t => !t.IsCompleted && t.Until != null && t.Until >= windowStart && t.Until <= windowEnd)
            .ToListAsync(cancellationToken);
        foreach (var task in tasks)
        {
            var dateOnly = IsMidnight(task.Until!.Value, ResolveTimeZone(await FamilyZoneAsync(task.FamilyId, cancellationToken)));
            result.Add(new Occurrence(
                task.Id, task.FamilyId, task.Title, task.Until.Value, dateOnly, IsTask: true, task.CollectionId,
                task.Collection is { Scope: CollectionScope.Personal } ? task.Collection.OwnerUserId : null,
                task.Assignments.Select(a => a.FamilyMemberId).ToList()));
        }

        var appointments = await db.Appointments.AsNoTracking()
            .Include(a => a.Assignments).Include(a => a.Exceptions)
            .Where(a => a.From != null && (a.RecurrenceRule != null || (a.From <= windowEnd && (a.Until ?? a.From) >= windowStart)))
            .ToListAsync(cancellationToken);
        foreach (var appointment in appointments)
        {
            foreach (var occurrence in recurrence.Expand(appointment, windowStart, windowEnd))
            {
                result.Add(new Occurrence(
                    appointment.Id, appointment.FamilyId, occurrence.Title, occurrence.From, appointment.AllDay, IsTask: false,
                    appointment.CollectionId, PersonalOwnerId: null, appointment.Assignments.Select(a => a.FamilyMemberId).ToList()));
            }
        }

        return result;
    }

    private readonly Dictionary<Guid, string?> _zoneCache = [];

    private async Task<string?> FamilyZoneAsync(Guid familyId, CancellationToken cancellationToken)
    {
        if (_zoneCache.TryGetValue(familyId, out var zone)) return zone;
        zone = await db.Families.Where(f => f.Id == familyId).Select(f => f.TimeZone).FirstOrDefaultAsync(cancellationToken);
        _zoneCache[familyId] = zone;
        return zone;
    }

    /// <summary>
    /// Personal list → its owner. Otherwise the assigned members with a login. Nobody assigned →
    /// everyone in the family (a family-wide item is everybody's to remember). Assigned only to
    /// members without a login → nobody, since there is nobody to push to.
    /// </summary>
    private static HashSet<Guid> Recipients(Occurrence occurrence, IReadOnlyList<Guid> familyUserIds, IReadOnlyDictionary<Guid, Guid> memberToUser)
    {
        if (occurrence.PersonalOwnerId is { } owner) return [owner];
        if (occurrence.AssignedMemberIds.Count == 0) return [.. familyUserIds];
        return occurrence.AssignedMemberIds.Where(memberToUser.ContainsKey).Select(m => memberToUser[m]).ToHashSet();
    }

    private static DateTimeOffset FireTime(Occurrence occurrence, int leadMinutes, TimeZoneInfo zone)
    {
        if (!occurrence.IsDateOnly) return occurrence.Start - TimeSpan.FromMinutes(leadMinutes);

        var local = TimeZoneInfo.ConvertTime(occurrence.Start, zone);
        // A date-only value written as UTC midnight (older data) names its UTC day, not the local one.
        var day = local.TimeOfDay == TimeSpan.Zero ? local.Date : occurrence.Start.UtcDateTime.Date;
        var wall = day.AddHours(DateOnlyReminderHour);
        return new DateTimeOffset(wall, zone.GetUtcOffset(wall));
    }

    /// <summary>Date-only due dates are stored at local midnight (older ones at UTC midnight).</summary>
    private static bool IsMidnight(DateTimeOffset value, TimeZoneInfo zone) =>
        TimeZoneInfo.ConvertTime(value, zone).TimeOfDay == TimeSpan.Zero || value.UtcDateTime.TimeOfDay == TimeSpan.Zero;

    private static TimeZoneInfo ResolveTimeZone(string? id)
    {
        try { return id is null ? TimeZoneInfo.Utc : TimeZoneInfo.FindSystemTimeZoneById(id); }
        catch (TimeZoneNotFoundException) { return TimeZoneInfo.Utc; }
    }

    private static string BuildPayload(Occurrence occurrence, TimeZoneInfo zone, string language)
    {
        var dutch = language == "nl";
        var local = TimeZoneInfo.ConvertTime(occurrence.Start, zone);
        var body = occurrence.IsDateOnly
            ? (dutch ? "Vandaag" : "Due today")
            : (dutch ? $"Om {local:HH:mm}" : $"At {local:HH:mm}");
        var url = occurrence.IsTask ? (occurrence.CollectionId is { } id ? $"/tasks/{id}" : "/tasks") : "/calendar";

        // Angular's service worker shows `notification` and follows `data.onActionClick` when it is tapped.
        return JsonSerializer.Serialize(new
        {
            notification = new
            {
                title = occurrence.Title,
                body,
                icon = "/icons/icon-192x192.png",
                tag = $"{occurrence.NodeId}:{occurrence.Start.ToUnixTimeSeconds()}",
                data = new { onActionClick = new { @default = new { operation = "navigateLastFocusedOrOpen", url } } },
            },
        });
    }
}
