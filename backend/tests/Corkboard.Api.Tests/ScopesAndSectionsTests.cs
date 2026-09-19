using Corkboard.Application.Collections;
using Corkboard.Application.Nodes;
using Corkboard.Contracts.Collections;
using Corkboard.Contracts.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;
using CollectionScope = Corkboard.Contracts.Collections.CollectionScope;
using CollectionType = Corkboard.Contracts.Collections.CollectionType;

namespace Corkboard.Api.Tests;

public class ScopesAndSectionsTests
{
    private readonly Guid _familyId = Guid.NewGuid();
    private readonly Guid _anna = Guid.NewGuid();
    private readonly Guid _ben = Guid.NewGuid();

    private CorkboardDbContext CreateDb()
    {
        var db = new CorkboardDbContext(new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Families.Add(new Family { Id = _familyId, Name = "Test", TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow });
        db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), FamilyId = _familyId, DisplayName = "Anna", Color = "#f00", LinkedUserId = _anna });
        db.FamilyMembers.Add(new FamilyMember { Id = Guid.NewGuid(), FamilyId = _familyId, DisplayName = "Ben", Color = "#0f0", LinkedUserId = _ben });
        db.SaveChanges();
        return db;
    }

    private static CreateCollectionRequest NewList(string name, CollectionScope scope = CollectionScope.Family) =>
        new(name, CollectionType.TaskList, "#123456", null, null, null, null, null, scope);

    private static CreateNodeRequest NewTask(string title, Guid? collectionId, Guid? sectionId = null) =>
        new(NodeType.Task, title, null, null, null, [], collectionId, null, null, sectionId, null, null, null,
            null, null, null, null, null, null, null, null, null);

    [Fact]
    public async Task Listing_task_lists_creates_a_family_inbox_and_a_personal_inbox_per_member_once()
    {
        await using var db = CreateDb();
        var service = new CollectionService(db);

        await service.ListAsync(_familyId, _anna, CollectionType.TaskList, null, CancellationToken.None);
        var again = await service.ListAsync(_familyId, _anna, CollectionType.TaskList, null, CancellationToken.None);
        var forBen = await service.ListAsync(_familyId, _ben, CollectionType.TaskList, null, CancellationToken.None);

        Assert.Equal(2, again.Count(c => c.IsInbox));
        Assert.Equal(2, forBen.Count(c => c.IsInbox));
        Assert.Equal(3, await db.Collections.CountAsync(c => c.IsInbox)); // 1 family + 1 personal each
    }

    [Fact]
    public async Task An_api_client_gets_no_personal_inbox()
    {
        await using var db = CreateDb();
        var service = new CollectionService(db);

        var lists = await service.ListAsync(_familyId, Guid.NewGuid(), CollectionType.TaskList, null, CancellationToken.None);

        Assert.Single(lists);
        Assert.Equal(Corkboard.Domain.Entities.CollectionScope.Family, lists[0].Scope);
    }

    [Fact]
    public async Task Personal_lists_and_their_tasks_are_hidden_from_everyone_else()
    {
        await using var db = CreateDb();
        var collections = new CollectionService(db);
        var nodes = new NodeService(db, new RecurrenceExpansionService());

        var personal = (await collections.CreateAsync(_familyId, _anna, NewList("Mine", CollectionScope.Personal), CancellationToken.None)).Value;
        var created = await nodes.CreateAsync(_familyId, _anna, NewTask("Secret", personal.Id), CancellationToken.None);

        var seenByBen = await collections.ListAsync(_familyId, _ben, CollectionType.TaskList, null, CancellationToken.None);
        Assert.DoesNotContain(seenByBen, c => c.Id == personal.Id);
        Assert.Equal(404, (await collections.GetAsync(_familyId, _ben, personal.Id, CancellationToken.None)).Error!.StatusCode);
        Assert.Empty(await nodes.ListAsync(_familyId, _ben, new NodeListFilter(NodeType.Task, null, null, null, null), CancellationToken.None));
        Assert.Equal(404, (await nodes.GetAsync(_familyId, _ben, created.Value.Id, CancellationToken.None)).Error!.StatusCode);
        Assert.False((await nodes.CreateAsync(_familyId, _ben, NewTask("Sneaky", personal.Id), CancellationToken.None)).IsSuccess);
        Assert.False((await nodes.DeleteAsync(_familyId, _ben, created.Value.Id, CancellationToken.None)).IsSuccess);

        Assert.Single(await nodes.ListAsync(_familyId, _anna, new NodeListFilter(NodeType.Task, null, null, null, null), CancellationToken.None));
    }

    [Fact]
    public async Task Only_task_lists_can_be_personal()
    {
        await using var db = CreateDb();
        var result = await new CollectionService(db).CreateAsync(
            _familyId, _anna, new CreateCollectionRequest("Cal", CollectionType.Calendar, "#fff", null, null, null, null, null, CollectionScope.Personal), CancellationToken.None);

        Assert.False(result.IsSuccess);
    }

    [Fact]
    public async Task Tasks_in_a_personal_list_default_to_their_owner()
    {
        await using var db = CreateDb();
        var collections = new CollectionService(db);
        var personal = (await collections.CreateAsync(_familyId, _anna, NewList("Mine", CollectionScope.Personal), CancellationToken.None)).Value;

        var task = (await new NodeService(db, new RecurrenceExpansionService()).CreateAsync(_familyId, _anna, NewTask("Mine", personal.Id), CancellationToken.None)).Value;

        var annaMember = await db.FamilyMembers.SingleAsync(m => m.LinkedUserId == _anna);
        Assert.Equal([annaMember.Id], task.AssignedFamilyMemberIds);
    }

    [Fact]
    public async Task The_inbox_cannot_be_deleted_or_renamed()
    {
        await using var db = CreateDb();
        var collections = new CollectionService(db);
        var inbox = (await collections.ListAsync(_familyId, _anna, CollectionType.TaskList, null, CancellationToken.None)).First(c => c.IsInbox);

        Assert.Equal(409, (await collections.DeleteAsync(_familyId, _anna, inbox.Id, CancellationToken.None)).Error!.StatusCode);
        var renamed = await collections.UpdateAsync(_familyId, _anna, inbox.Id, new UpdateCollectionRequest("Other", "#000", null, null, null, null), CancellationToken.None);
        Assert.Equal("Inbox", renamed.Value.Name);
    }

    [Fact]
    public async Task Sections_are_unique_by_name_and_deleting_one_keeps_its_tasks()
    {
        await using var db = CreateDb();
        var collections = new CollectionService(db);
        var nodes = new NodeService(db, new RecurrenceExpansionService());
        var list = (await collections.CreateAsync(_familyId, _anna, NewList("Shop"), CancellationToken.None)).Value;

        var first = (await collections.CreateSectionAsync(_familyId, _anna, list.Id, new CreateSectionRequest("Produce"), CancellationToken.None)).Value;
        var again = (await collections.CreateSectionAsync(_familyId, _anna, list.Id, new CreateSectionRequest(" produce "), CancellationToken.None)).Value;
        Assert.Equal(first.Id, again.Id);

        var task = (await nodes.CreateAsync(_familyId, _anna, NewTask("Apples", list.Id, first.Id), CancellationToken.None)).Value;
        Assert.Equal(first.Id, task.SectionId);

        await collections.DeleteSectionAsync(_familyId, _anna, first.Id, CancellationToken.None);
        Assert.Empty(await collections.ListSectionsAsync(_familyId, _anna, list.Id, CancellationToken.None));
    }

    [Fact]
    public async Task A_task_cannot_use_a_section_from_another_list()
    {
        await using var db = CreateDb();
        var collections = new CollectionService(db);
        var nodes = new NodeService(db, new RecurrenceExpansionService());
        var a = (await collections.CreateAsync(_familyId, _anna, NewList("A"), CancellationToken.None)).Value;
        var b = (await collections.CreateAsync(_familyId, _anna, NewList("B"), CancellationToken.None)).Value;
        var sectionInA = (await collections.CreateSectionAsync(_familyId, _anna, a.Id, new CreateSectionRequest("S"), CancellationToken.None)).Value;

        Assert.False((await nodes.CreateAsync(_familyId, _anna, NewTask("x", b.Id, sectionInA.Id), CancellationToken.None)).IsSuccess);
    }
}
