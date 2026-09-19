using Corkboard.Application.Common;
using Corkboard.Application.Nodes;
using Corkboard.Contracts.Collections;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;
using CollectionScope = Corkboard.Domain.Entities.CollectionScope;
using CollectionType = Corkboard.Domain.Entities.CollectionType;
using NodeType = Corkboard.Contracts.Nodes.NodeType;

namespace Corkboard.Api.Tests;

public class NodeListQueryTests
{
    private readonly Guid _familyId = Guid.NewGuid();
    private readonly Guid _anna = Guid.NewGuid();

    private (CorkboardDbContext Db, NodeService Service) Seed()
    {
        var db = new CorkboardDbContext(new DbContextOptionsBuilder<CorkboardDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        db.Families.Add(new Family { Id = _familyId, Name = "Test", TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow });

        var shared = new Collection { Id = Guid.NewGuid(), FamilyId = _familyId, Name = "Shared", Type = CollectionType.TaskList, Color = "#111111", Scope = CollectionScope.Family, CreatedByUserId = _anna };
        var mine = new Collection { Id = Guid.NewGuid(), FamilyId = _familyId, Name = "Mine", Type = CollectionType.TaskList, Color = "#222222", Scope = CollectionScope.Personal, OwnerUserId = _anna, CreatedByUserId = _anna };
        db.Collections.AddRange(shared, mine);

        var t0 = DateTimeOffset.UtcNow.AddDays(-10);
        TaskNode Task(string title, Collection list, int day, bool done = false, int? priority = null) =>
            new() { Id = Guid.NewGuid(), FamilyId = _familyId, Title = title, CollectionId = list.Id, IsCompleted = done, Priority = priority, Until = t0.AddDays(day), CreatedAt = t0.AddDays(day), UpdatedAt = t0, CreatedByUserId = _anna };

        db.Nodes.AddRange(
            Task("Buy milk", shared, 1, priority: 1),
            Task("Call dentist", shared, 2, done: true, priority: 3),
            Task("Plan holiday", mine, 3, priority: 2),
            Task("Milk the cow", mine, 4),
            new Note { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "A note", CreatedAt = t0, UpdatedAt = t0, CreatedByUserId = _anna });
        db.SaveChanges();
        return (db, new NodeService(db, new RecurrenceExpansionService()));
    }

    private static NodeListFilter Tasks(bool? isCompleted = null, CollectionScope? scope = null, string? search = null, string? sort = null, int? page = null, int? pageSize = null, int? priority = null) =>
        new(NodeType.Task, null, null, null, null, isCompleted, scope is null ? null : (Corkboard.Contracts.Collections.CollectionScope)scope, null, priority, search, sort, page is null && pageSize is null ? null : new PageRequest(page ?? 1, pageSize ?? 50));

    [Fact]
    public async Task Filters_by_completion_scope_search_and_priority()
    {
        var (db, service) = Seed();
        await using var _ = db;

        var open = await service.ListAsync(_familyId, _anna, Tasks(isCompleted: false), CancellationToken.None);
        Assert.Equal(3, open.TotalCount);

        var personal = await service.ListAsync(_familyId, _anna, Tasks(scope: CollectionScope.Personal), CancellationToken.None);
        Assert.Equal(new[] { "Plan holiday", "Milk the cow" }, personal.Items.Select(t => t.Title));

        var milk = await service.ListAsync(_familyId, _anna, Tasks(search: "MILK"), CancellationToken.None);
        Assert.Equal(2, milk.TotalCount);

        var high = await service.ListAsync(_familyId, _anna, Tasks(priority: 3), CancellationToken.None);
        Assert.Equal("Call dentist", Assert.Single(high.Items).Title);
    }

    [Fact]
    public async Task Filters_by_due_window_and_importance()
    {
        var (db, service) = Seed();
        await using var _ = db;
        var t0 = DateTimeOffset.UtcNow.AddDays(-10);

        // Tasks are due t0+1 … t0+4 days; the Note has no due date.
        var overdue = await service.ListAsync(_familyId, _anna, new NodeListFilter(null, null, null, null, null, DueUntil: t0.AddDays(2.5)), CancellationToken.None);
        Assert.Equal(new[] { "Buy milk", "Call dentist" }, overdue.Items.Select(t => t.Title).Order());

        var window = await service.ListAsync(_familyId, _anna, new NodeListFilter(null, null, null, null, null, DueFrom: t0.AddDays(2.5), DueUntil: t0.AddDays(3.5)), CancellationToken.None);
        Assert.Equal("Plan holiday", Assert.Single(window.Items).Title);

        var important = await service.ListAsync(_familyId, _anna, new NodeListFilter(NodeType.Note, null, null, null, null, IsImportant: true), CancellationToken.None);
        Assert.Empty(important.Items);
    }

    [Fact]
    public async Task Sorts_and_pages_with_a_total_count()
    {
        var (db, service) = Seed();
        await using var _ = db;

        var byTitleDesc = await service.ListAsync(_familyId, _anna, Tasks(sort: "-title"), CancellationToken.None);
        Assert.Equal(new[] { "Plan holiday", "Milk the cow", "Call dentist", "Buy milk" }, byTitleDesc.Items.Select(t => t.Title));

        var byPriority = await service.ListAsync(_familyId, _anna, Tasks(sort: "-priority"), CancellationToken.None);
        Assert.Equal("Call dentist", byPriority.Items[0].Title);

        var secondPage = await service.ListAsync(_familyId, _anna, Tasks(sort: "due", page: 2, pageSize: 3), CancellationToken.None);
        Assert.Equal(4, secondPage.TotalCount);
        Assert.Equal("Milk the cow", Assert.Single(secondPage.Items).Title);

        var unpaged = await service.ListAsync(_familyId, _anna, Tasks(), CancellationToken.None);
        Assert.Equal(4, unpaged.Items.Count);
    }

    [Fact]
    public async Task Sorts_notes_important_first_and_contacts_by_name()
    {
        var (db, service) = Seed();
        await using var _ = db;
        var now = DateTimeOffset.UtcNow;
        db.Nodes.AddRange(
            new Note { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "Old but important", IsImportant = true, CreatedAt = now.AddDays(-5), UpdatedAt = now, CreatedByUserId = _anna },
            new Note { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "New", CreatedAt = now, UpdatedAt = now, CreatedByUserId = _anna },
            new Contact { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "Bo Zed", FirstName = "Bo", LastName = "Zed", CreatedAt = now, UpdatedAt = now, CreatedByUserId = _anna },
            new Contact { Id = Guid.NewGuid(), FamilyId = _familyId, Title = "Cy Abel", FirstName = "Cy", LastName = "Abel", CreatedAt = now, UpdatedAt = now, CreatedByUserId = _anna });
        db.SaveChanges();

        var notes = await service.ListAsync(_familyId, _anna, new NodeListFilter(NodeType.Note, null, null, null, null, Sort: "-important"), CancellationToken.None);
        Assert.Equal(new[] { "Old but important", "New", "A note" }, notes.Items.Select(n => n.Title));

        var contacts = await service.ListAsync(_familyId, _anna, new NodeListFilter(NodeType.Contact, null, null, null, null, Sort: "name"), CancellationToken.None);
        Assert.Equal(new[] { "Cy Abel", "Bo Zed" }, contacts.Items.Select(c => c.Title));
    }

    [Fact]
    public void Sort_keys_are_validated_case_insensitively_with_an_optional_minus()
    {
        Assert.True(NodeSortKeys.IsValid(null));
        Assert.True(NodeSortKeys.IsValid("-Due"));
        Assert.False(NodeSortKeys.IsValid("password"));
    }
}
