using Corkboard.Application.Collections;
using Corkboard.Application.Common;
using Corkboard.Contracts.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.EntityFrameworkCore;
using ContractNodeType = Corkboard.Contracts.Nodes.NodeType;

namespace Corkboard.Application.Nodes;

public class NodeService(CorkboardDbContext db, RecurrenceExpansionService recurrence) : INodeService
{
    public async Task<PagedResult<NodeResponse>> ListAsync(Guid familyId, Guid userId, NodeListFilter filter, CancellationToken cancellationToken)
    {
        var query = db.Nodes
            .AsNoTracking()
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .Where(n => n.FamilyId == familyId)
            .Where(VisibleTo(userId));

        query = filter.Type switch
        {
            ContractNodeType.Note => query.Where(n => n is Note),
            ContractNodeType.Task => query.Where(n => n is TaskNode),
            ContractNodeType.Appointment => query.Where(n => n is Appointment),
            ContractNodeType.Contact => query.Where(n => n is Contact),
            _ => query,
        };

        if (filter.AssignedTo is { } familyMemberId)
        {
            query = query.Where(n => n.Assignments.Any(a => a.FamilyMemberId == familyMemberId));
        }

        if (filter.CollectionId is { } collectionIdValue)
        {
            query = query.Where(n => n.CollectionId == collectionIdValue);
        }

        if (filter.From is { } fromValue)
        {
            query = query.Where(n => n.Until != null ? n.Until >= fromValue : n.From == null || n.From >= fromValue);
        }

        if (filter.Until is { } untilValue)
        {
            query = query.Where(n => n.From == null || n.From <= untilValue);
        }

        if (filter.IsCompleted is { } isCompleted)
        {
            query = query.Where(n => ((TaskNode)n).IsCompleted == isCompleted);
        }

        if (filter.DueFrom is { } dueFrom)
        {
            query = query.Where(n => n.Until != null && n.Until >= dueFrom);
        }

        if (filter.DueUntil is { } dueUntil)
        {
            query = query.Where(n => n.Until != null && n.Until < dueUntil);
        }

        if (filter.IsImportant is { } isImportant)
        {
            query = query.Where(n => ((Note)n).IsImportant == isImportant);
        }

        if (filter.Scope is { } scope)
        {
            var domainScope = (CollectionScope)scope;
            query = query.Where(n => n.Collection == null ? domainScope == CollectionScope.Family : n.Collection.Scope == domainScope);
        }

        if (filter.SectionId is { } sectionId)
        {
            query = query.Where(n => ((TaskNode)n).SectionId == sectionId);
        }

        if (filter.Priority is { } priority)
        {
            query = query.Where(n => ((TaskNode)n).Priority == priority);
        }

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var term = filter.Search.Trim().ToLower();
            query = query.Where(n => n.Title.ToLower().Contains(term) || (n.Description != null && n.Description.ToLower().Contains(term)));
        }

        var page = await ApplySort(query, filter.Sort).ToPagedAsync(filter.Paging ?? PageRequest.Default, cancellationToken);
        return new PagedResult<NodeResponse>(page.Items.Select(ToResponse).ToList(), page.TotalCount);
    }

    /// <summary>Always ends on Id so pages are stable when the sort key ties.</summary>
    private static IQueryable<Node> ApplySort(IQueryable<Node> query, string? sort)
    {
        var descending = sort?.StartsWith('-') == true;
        var ordered = sort?.TrimStart('-').ToLowerInvariant() switch
        {
            "updatedat" => descending ? query.OrderByDescending(n => n.UpdatedAt) : query.OrderBy(n => n.UpdatedAt),
            "title" => descending ? query.OrderByDescending(n => n.Title) : query.OrderBy(n => n.Title),
            "due" => descending ? query.OrderByDescending(n => n.Until ?? n.CreatedAt) : query.OrderBy(n => n.Until ?? n.CreatedAt),
            "until" => descending ? query.OrderByDescending(n => n.Until) : query.OrderBy(n => n.Until),
            "important" => (descending ? query.OrderByDescending(n => ((Note)n).IsImportant) : query.OrderBy(n => ((Note)n).IsImportant)).ThenByDescending(n => n.CreatedAt),
            "name" => (descending ? query.OrderByDescending(n => ((Contact)n).LastName ?? "") : query.OrderBy(n => ((Contact)n).LastName ?? "")).ThenBy(n => ((Contact)n).FirstName ?? ""),
            "priority" => descending ? query.OrderByDescending(n => ((TaskNode)n).Priority ?? 0) : query.OrderBy(n => ((TaskNode)n).Priority ?? 0),
            _ => descending ? query.OrderByDescending(n => n.CreatedAt) : query.OrderBy(n => n.CreatedAt),
        };
        return ordered.ThenBy(n => n.Id);
    }

    public async Task<Result<NodeResponse>> GetAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var node = await db.Nodes
            .AsNoTracking()
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .Where(VisibleTo(userId))
            .FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);

        return node is null ? Result<NodeResponse>.Failure(Error.NotFound()) : Result<NodeResponse>.Success(ToResponse(node));
    }

    public async Task<Result<NodeResponse>> CreateAsync(Guid familyId, Guid userId, CreateNodeRequest request, CancellationToken cancellationToken)
    {
        var assignedIds = await ValidateFamilyMemberIds(familyId, request.AssignedFamilyMemberIds, cancellationToken);
        if (assignedIds is null) return Result<NodeResponse>.Failure(InvalidAssigneesError);

        if (!await CollectionValidation.ExistsAsync(db, familyId, userId, request.CollectionId, cancellationToken)) return Result<NodeResponse>.Failure(InvalidCollectionError);

        if (request.Type == ContractNodeType.Task && !await SectionBelongsToAsync(request.SectionId, request.CollectionId, cancellationToken)) return Result<NodeResponse>.Failure(InvalidSectionError);

        // Tasks in a Personal list default to their owner, so they show up under "assigned to me".
        if (request.Type == ContractNodeType.Task && assignedIds.Count == 0 && request.CollectionId is { } listId
            && await db.Collections.AnyAsync(c => c.Id == listId && c.Scope == CollectionScope.Personal, cancellationToken))
        {
            var ownerMemberId = await db.FamilyMembers
                .Where(m => m.FamilyId == familyId && m.LinkedUserId == userId)
                .Select(m => (Guid?)m.Id).FirstOrDefaultAsync(cancellationToken);
            if (ownerMemberId is { } id) assignedIds = [id];
        }

        if (request.Type == ContractNodeType.Contact && string.IsNullOrWhiteSpace(request.FirstName))
        {
            return Result<NodeResponse>.Failure(InvalidContactError);
        }

        var now = DateTimeOffset.UtcNow;
        Node node = request.Type switch
        {
            ContractNodeType.Note => new Note { Title = request.Title, IsImportant = request.IsImportant ?? false },
            ContractNodeType.Task => new TaskNode
            {
                Title = request.Title,
                Priority = request.Priority,
                SectionId = request.SectionId,
                RecurrenceRule = request.RecurrenceRule,
            },
            ContractNodeType.Appointment => new Appointment
            {
                Title = request.Title,
                Location = request.Location,
                AllDay = request.AllDay ?? false,
                RecurrenceRule = request.RecurrenceRule,
            },
            ContractNodeType.Contact => new Contact
            {
                Title = BuildContactTitle(request.FirstName!, request.LastName),
                FirstName = request.FirstName!.Trim(),
                LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim(),
                DateOfBirth = request.DateOfBirth,
                Street = request.Street,
                City = request.City,
                PostalCode = request.PostalCode,
                Country = request.Country,
                PhoneNumbers = (request.PhoneNumbers ?? []).Select(p => new ContactPhoneNumber { Id = Guid.NewGuid(), Number = p.Number, Label = p.Label }).ToList(),
                Emails = (request.Emails ?? []).Select(e => new ContactEmail { Id = Guid.NewGuid(), Email = e.Email, Label = e.Label }).ToList(),
            },
            _ => throw new ArgumentOutOfRangeException(nameof(request)),
        };

        node.Id = Guid.NewGuid();
        node.FamilyId = familyId;
        node.Description = request.Description;
        node.From = request.From;
        node.Until = request.Until;
        node.CollectionId = request.CollectionId;
        node.CreatedAt = now;
        node.UpdatedAt = now;
        node.CreatedByUserId = userId;
        node.Assignments = assignedIds.Select(memberId => new NodeAssignment { FamilyMemberId = memberId }).ToList();

        db.Nodes.Add(node);
        await db.SaveChangesAsync(cancellationToken);

        return Result<NodeResponse>.Success(ToResponse(node));
    }

    public async Task<Result<NodeResponse>> UpdateAsync(Guid familyId, Guid userId, Guid id, UpdateNodeRequest request, CancellationToken cancellationToken)
    {
        var node = await db.Nodes
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .Where(VisibleTo(userId))
            .FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);
        if (node is null) return Result<NodeResponse>.Failure(Error.NotFound());

        var assignedIds = await ValidateFamilyMemberIds(familyId, request.AssignedFamilyMemberIds, cancellationToken);
        if (assignedIds is null) return Result<NodeResponse>.Failure(InvalidAssigneesError);

        if (!await CollectionValidation.ExistsAsync(db, familyId, userId, request.CollectionId, cancellationToken)) return Result<NodeResponse>.Failure(InvalidCollectionError);

        if (node is TaskNode && !await SectionBelongsToAsync(request.SectionId, request.CollectionId, cancellationToken)) return Result<NodeResponse>.Failure(InvalidSectionError);

        if (node is Contact && string.IsNullOrWhiteSpace(request.FirstName))
        {
            return Result<NodeResponse>.Failure(InvalidContactError);
        }

        node.Title = request.Title;
        node.Description = request.Description;
        node.From = request.From;
        node.Until = request.Until;
        node.CollectionId = request.CollectionId;
        node.UpdatedAt = DateTimeOffset.UtcNow;

        switch (node)
        {
            case Note note:
                note.IsImportant = request.IsImportant ?? note.IsImportant;
                break;
            case TaskNode task:
                task.Priority = request.Priority;
                task.SectionId = request.SectionId;
                task.RecurrenceRule = request.RecurrenceRule;

                // Completing a recurring Task rolls Until forward to the next occurrence
                // instead of finishing it for good — matches Todoist's recurring-task model.
                // Falls through to a normal completion once the rule has no more occurrences.
                var nextDue = request.IsCompleted is true && task.RecurrenceRule is { } rule && task.Until is { } dueDate
                    ? recurrence.NextOccurrenceAfter(dueDate, rule)
                    : null;

                if (nextDue is { } next)
                {
                    task.Until = next;
                    task.IsCompleted = false;
                    task.CompletedAt = null;
                }
                else if (request.IsCompleted is { } isCompleted)
                {
                    task.IsCompleted = isCompleted;
                    task.CompletedAt = isCompleted ? task.CompletedAt ?? DateTimeOffset.UtcNow : null;
                }
                break;
            case Appointment appointment:
                appointment.Location = request.Location;
                appointment.AllDay = request.AllDay ?? appointment.AllDay;
                appointment.RecurrenceRule = request.RecurrenceRule;
                break;
            case Contact contact:
                contact.FirstName = request.FirstName!.Trim();
                contact.LastName = string.IsNullOrWhiteSpace(request.LastName) ? null : request.LastName.Trim();
                contact.Title = BuildContactTitle(contact.FirstName, contact.LastName);
                contact.DateOfBirth = request.DateOfBirth;
                contact.Street = request.Street;
                contact.City = request.City;
                contact.PostalCode = request.PostalCode;
                contact.Country = request.Country;

                // Explicit RemoveRange/AddRange via the DbSets rather than mutating
                // contact.PhoneNumbers/Emails in place — the latter, combined with
                // this entity having been loaded through a cast-based Include (see
                // the query above), left EF's change tracker treating new rows as
                // updates to nonexistent ones (DbUpdateConcurrencyException).
                db.ContactPhoneNumbers.RemoveRange(contact.PhoneNumbers);
                contact.PhoneNumbers = (request.PhoneNumbers ?? [])
                    .Select(p => new ContactPhoneNumber { Id = Guid.NewGuid(), ContactId = contact.Id, Number = p.Number, Label = p.Label })
                    .ToList();
                db.ContactPhoneNumbers.AddRange(contact.PhoneNumbers);

                db.ContactEmails.RemoveRange(contact.Emails);
                contact.Emails = (request.Emails ?? [])
                    .Select(e => new ContactEmail { Id = Guid.NewGuid(), ContactId = contact.Id, Email = e.Email, Label = e.Label })
                    .ToList();
                db.ContactEmails.AddRange(contact.Emails);
                break;
        }

        node.Assignments.Clear();
        foreach (var memberId in assignedIds)
        {
            node.Assignments.Add(new NodeAssignment { NodeId = node.Id, FamilyMemberId = memberId });
        }

        await db.SaveChangesAsync(cancellationToken);

        return Result<NodeResponse>.Success(ToResponse(node));
    }

    public async Task<Result> DeleteAsync(Guid familyId, Guid userId, Guid id, CancellationToken cancellationToken)
    {
        var node = await db.Nodes.Where(VisibleTo(userId)).FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);
        if (node is null) return Result.Failure(Error.NotFound());

        db.Nodes.Remove(node);
        await db.SaveChangesAsync(cancellationToken);

        return Result.Success();
    }

    /// <summary>Null return means one or more ids don't belong to this Family.</summary>
    private async Task<List<Guid>?> ValidateFamilyMemberIds(Guid familyId, IReadOnlyList<Guid> requestedIds, CancellationToken cancellationToken)
    {
        if (requestedIds.Count == 0) return [];

        var distinctIds = requestedIds.Distinct().ToList();
        var validCount = await db.FamilyMembers.CountAsync(
            m => m.FamilyId == familyId && distinctIds.Contains(m.Id), cancellationToken);

        return validCount == distinctIds.Count ? distinctIds : null;
    }

    private static Error InvalidAssigneesError => Error.BadRequest(
        "Invalid assignee", "One or more AssignedFamilyMemberIds don't belong to this Family.");

    private static Error InvalidCollectionError => Error.BadRequest(
        "Invalid collection", "CollectionId doesn't belong to this Family.");

    private static Error InvalidContactError => Error.BadRequest(
        "Invalid contact", "A Contact requires a FirstName.");

    private static Error InvalidSectionError => Error.BadRequest(
        "Invalid section", "SectionId must be a Section of the Task's own list.");

    /// <summary>Null section is always fine; otherwise it has to live in the Task's list (so moving lists means picking a section there, or none).</summary>
    private async Task<bool> SectionBelongsToAsync(Guid? sectionId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (sectionId is not { } id) return true;
        return collectionId is { } listId && await db.Sections.AnyAsync(s => s.Id == id && s.CollectionId == listId, cancellationToken);
    }

    /// <summary>Nodes outside any list, in a Family list, or in the caller's own Personal list.</summary>
    private static System.Linq.Expressions.Expression<Func<Node, bool>> VisibleTo(Guid userId) =>
        n => n.Collection == null || n.Collection.Scope == CollectionScope.Family || n.Collection.OwnerUserId == userId;

    private static string BuildContactTitle(string firstName, string? lastName) =>
        string.IsNullOrWhiteSpace(lastName) ? firstName.Trim() : $"{firstName.Trim()} {lastName.Trim()}";

    private static NodeResponse ToResponse(Node node)
    {
        var assignedIds = node.Assignments.Select(a => a.FamilyMemberId).ToList();

        return node switch
        {
            TaskNode task => new NodeResponse(
                task.Id, ContractNodeType.Task, task.Title, task.Description, task.From, task.Until,
                task.CreatedAt, task.UpdatedAt, task.CreatedByUserId, assignedIds, task.CollectionId,
                IsImportant: null,
                task.IsCompleted, task.CompletedAt, task.Priority, task.SectionId,
                Location: null, AllDay: null, task.RecurrenceRule,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
            Appointment appointment => new NodeResponse(
                appointment.Id, ContractNodeType.Appointment, appointment.Title, appointment.Description, appointment.From, appointment.Until,
                appointment.CreatedAt, appointment.UpdatedAt, appointment.CreatedByUserId, assignedIds, appointment.CollectionId,
                IsImportant: null,
                IsCompleted: null, CompletedAt: null, Priority: null, SectionId: null,
                appointment.Location, appointment.AllDay, appointment.RecurrenceRule,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
            Contact contact => new NodeResponse(
                contact.Id, ContractNodeType.Contact, contact.Title, contact.Description, contact.From, contact.Until,
                contact.CreatedAt, contact.UpdatedAt, contact.CreatedByUserId, assignedIds, contact.CollectionId,
                IsImportant: null,
                IsCompleted: null, CompletedAt: null, Priority: null, SectionId: null,
                Location: null, AllDay: null, RecurrenceRule: null,
                contact.FirstName, contact.LastName, contact.DateOfBirth,
                contact.Street, contact.City, contact.PostalCode, contact.Country,
                contact.PhoneNumbers.Select(p => new ContactPhoneNumberDto(p.Number, p.Label)).ToList(),
                contact.Emails.Select(e => new ContactEmailDto(e.Email, e.Label)).ToList()),
            Note note => new NodeResponse(
                note.Id, ContractNodeType.Note, note.Title, note.Description, note.From, note.Until,
                note.CreatedAt, note.UpdatedAt, note.CreatedByUserId, assignedIds, note.CollectionId,
                note.IsImportant,
                IsCompleted: null, CompletedAt: null, Priority: null, SectionId: null,
                Location: null, AllDay: null, RecurrenceRule: null,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
            _ => throw new ArgumentOutOfRangeException(nameof(node)),
        };
    }
}
