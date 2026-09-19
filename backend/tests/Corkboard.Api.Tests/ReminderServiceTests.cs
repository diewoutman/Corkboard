using Corkboard.Application.Notifications;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Tests;

public class ReminderServiceTests
{
    // 10:00 UTC = 12:00 in Europe/Amsterdam (CEST).
    private static readonly DateTimeOffset Now = new(2026, 9, 21, 10, 0, 0, TimeSpan.Zero);

    private readonly Guid _familyId = Guid.NewGuid();
    private readonly Guid _anna = Guid.NewGuid();
    private readonly Guid _ben = Guid.NewGuid();
    private readonly Guid _annaMember = Guid.NewGuid();
    private readonly FakeSender _sender = new();

    private sealed class FakeSender : IPushSender
    {
        public List<(Guid SubscriptionId, string Payload)> Sent { get; } = [];
        public PushResult Result { get; set; } = PushResult.Sent;

        public Task<PushResult> SendAsync(Corkboard.Domain.Entities.PushSubscription subscription, string payloadJson, CancellationToken cancellationToken)
        {
            if (Result == PushResult.Sent) Sent.Add((subscription.Id, payloadJson));
            return Task.FromResult(Result);
        }
    }

    private CorkboardDbContext CreateDb()
    {
        var db = new CorkboardDbContext(new DbContextOptionsBuilder<CorkboardDbContext>().UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Families.Add(new Family { Id = _familyId, Name = "Test", TimeZone = "Europe/Amsterdam", CreatedAt = Now });
        db.UserFamilies.AddRange(
            new UserFamily { UserId = _anna, FamilyId = _familyId, Role = FamilyRole.Owner },
            new UserFamily { UserId = _ben, FamilyId = _familyId, Role = FamilyRole.Adult });
        db.FamilyMembers.Add(new FamilyMember { Id = _annaMember, FamilyId = _familyId, DisplayName = "Anna", Color = "#f00", LinkedUserId = _anna });
        db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), FamilyId = _familyId, DisplayName = "Ben", Color = "#0f0", LinkedUserId = _ben });
        db.SaveChanges();
        return db;
    }

    private static Guid AddDevice(CorkboardDbContext db, Guid userId, int leadMinutes)
    {
        var id = Guid.NewGuid();
        db.PushSubscriptions.Add(new Corkboard.Domain.Entities.PushSubscription
        {
            Id = id, UserId = userId, Endpoint = $"https://push.example.com/{id}", P256dh = "k", Auth = "a", LeadMinutes = leadMinutes, CreatedAt = Now, LastSeenAt = Now,
        });
        db.SaveChanges();
        return id;
    }

    private TaskNode AddTask(CorkboardDbContext db, DateTimeOffset? until, Guid? collectionId = null, params Guid[] assignedMembers)
    {
        var task = new TaskNode { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "Take out trash", Until = until, CollectionId = collectionId, CreatedAt = Now, UpdatedAt = Now };
        task.Assignments = assignedMembers.Select(m => new NodeAssignment { NodeId = task.Id, FamilyMemberId = m }).ToList();
        db.Nodes.Add(task);
        db.SaveChanges();
        return task;
    }

    private ReminderService Service(CorkboardDbContext db) => new(db, new RecurrenceExpansionService(), _sender);

    [Fact]
    public async Task Sends_once_when_the_lead_time_is_reached_and_never_again()
    {
        await using var db = CreateDb();
        var device = AddDevice(db, _anna, leadMinutes: 15);
        AddTask(db, Now.AddMinutes(10));

        Assert.Equal(1, await Service(db).SendDueRemindersAsync(Now, CancellationToken.None));
        Assert.Equal(0, await Service(db).SendDueRemindersAsync(Now.AddMinutes(1), CancellationToken.None));

        Assert.Equal(device, Assert.Single(_sender.Sent).SubscriptionId);
        Assert.Contains("Take out trash", _sender.Sent[0].Payload);
        Assert.Contains("At 12:10", _sender.Sent[0].Payload); // family-local time
    }

    [Fact]
    public async Task Waits_until_the_lead_time_and_drops_reminders_that_are_long_overdue()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, leadMinutes: 5);
        AddTask(db, Now.AddMinutes(10));   // fires in 5 minutes
        AddTask(db, Now.AddHours(-2));     // fired long ago

        Assert.Equal(0, await Service(db).SendDueRemindersAsync(Now, CancellationToken.None));
        Assert.Equal(1, await Service(db).SendDueRemindersAsync(Now.AddMinutes(6), CancellationToken.None));
    }

    [Fact]
    public async Task Completed_tasks_are_not_reminded()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, 0);
        AddTask(db, Now).IsCompleted = true;
        await db.SaveChangesAsync();

        Assert.Equal(0, await Service(db).SendDueRemindersAsync(Now, CancellationToken.None));
    }

    [Fact]
    public async Task Personal_tasks_go_to_their_owner_only()
    {
        await using var db = CreateDb();
        var annaDevice = AddDevice(db, _anna, 0);
        AddDevice(db, _ben, 0);
        var personal = new Collection { Id = Guid.NewGuid(), FamilyId = _familyId, Name = "Mine", Color = "#fff", Scope = CollectionScope.Personal, OwnerUserId = _anna };
        db.Collections.Add(personal);
        db.SaveChanges();
        AddTask(db, Now, personal.Id);

        await Service(db).SendDueRemindersAsync(Now, CancellationToken.None);

        Assert.Equal(annaDevice, Assert.Single(_sender.Sent).SubscriptionId);
    }

    [Fact]
    public async Task Assigned_tasks_go_to_the_assignee_and_unassigned_ones_to_the_whole_family()
    {
        await using var db = CreateDb();
        var annaDevice = AddDevice(db, _anna, 0);
        AddDevice(db, _ben, 0);
        AddTask(db, Now, null, _annaMember);

        await Service(db).SendDueRemindersAsync(Now, CancellationToken.None);
        Assert.Equal(annaDevice, Assert.Single(_sender.Sent).SubscriptionId);

        _sender.Sent.Clear();
        AddTask(db, Now);
        await Service(db).SendDueRemindersAsync(Now, CancellationToken.None);
        Assert.Equal(2, _sender.Sent.Count);
    }

    [Fact]
    public async Task A_date_only_task_is_reminded_at_nine_local_on_its_day()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, 0);
        // "Due Monday 21 Sep" stored as local midnight = Sunday 22:00 UTC.
        AddTask(db, new DateTimeOffset(2026, 9, 20, 22, 0, 0, TimeSpan.Zero));

        var beforeNine = new DateTimeOffset(2026, 9, 21, 6, 59, 0, TimeSpan.Zero); // 08:59 local
        var atNine = new DateTimeOffset(2026, 9, 21, 7, 0, 0, TimeSpan.Zero);      // 09:00 local

        Assert.Equal(0, await Service(db).SendDueRemindersAsync(beforeNine, CancellationToken.None));
        Assert.Equal(1, await Service(db).SendDueRemindersAsync(atNine, CancellationToken.None));
        Assert.Contains("Due today", _sender.Sent[0].Payload);
    }

    [Fact]
    public async Task A_recurring_appointment_is_reminded_once_per_occurrence()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, 0);
        var start = Now.AddDays(-14); // weekly, so an occurrence falls exactly at Now and again a week later
        db.Nodes.Add(new Appointment { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "Football", From = start, Until = start.AddHours(1), RecurrenceRule = "FREQ=WEEKLY", CreatedAt = Now, UpdatedAt = Now });
        db.SaveChanges();

        Assert.Equal(1, await Service(db).SendDueRemindersAsync(Now, CancellationToken.None));
        Assert.Equal(0, await Service(db).SendDueRemindersAsync(Now.AddMinutes(1), CancellationToken.None));
        Assert.Equal(1, await Service(db).SendDueRemindersAsync(Now.AddDays(7), CancellationToken.None));
    }

    [Fact]
    public async Task A_subscription_the_push_service_reports_gone_is_removed()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, 0);
        AddTask(db, Now);
        _sender.Result = PushResult.Gone;

        await Service(db).SendDueRemindersAsync(Now, CancellationToken.None);

        Assert.Empty(db.PushSubscriptions);
    }

    [Fact]
    public async Task A_transient_failure_is_retried_on_the_next_run()
    {
        await using var db = CreateDb();
        AddDevice(db, _anna, 0);
        AddTask(db, Now);
        _sender.Result = PushResult.Failed;
        Assert.Equal(0, await Service(db).SendDueRemindersAsync(Now, CancellationToken.None));

        _sender.Result = PushResult.Sent;
        Assert.Equal(1, await Service(db).SendDueRemindersAsync(Now.AddMinutes(1), CancellationToken.None));
    }

    [Theory]
    [InlineData("https://fcm.googleapis.com/fcm/send/abc", true)]
    [InlineData("https://web.push.apple.com/xyz", true)]
    [InlineData("http://fcm.googleapis.com/fcm/send/abc", false)]
    [InlineData("https://localhost/x", false)]
    [InlineData("https://127.0.0.1/x", false)]
    [InlineData("https://192.168.1.10/x", false)]
    [InlineData("https://10.0.0.5/x", false)]
    [InlineData("https://169.254.169.254/latest/meta-data", false)]
    [InlineData("https://nas/x", false)]
    [InlineData("not a url", false)]
    public void Endpoint_validation_only_accepts_public_https_urls(string endpoint, bool expected) =>
        Assert.Equal(expected, NotificationService.IsAcceptableEndpoint(endpoint));
}
