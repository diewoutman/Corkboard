using Corkboard.Api.Common;
using Corkboard.Contracts.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ContractNodeType = Corkboard.Contracts.Nodes.NodeType;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/nodes")]
public class NodesController(CorkboardDbContext db) : FamilyScopedControllerBase
{
    /// <summary>
    /// Lists Nodes in the caller's Family, optionally filtered by type, assignee,
    /// containing Collection, and a From/Until window. The window filter treats a
    /// null From/Until on a Node as open-ended (a plain Note has neither) rather
    /// than excluding it.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<NodeResponse>>> List(
        [FromQuery] ContractNodeType? type,
        [FromQuery] Guid? assignedTo,
        [FromQuery] Guid? collectionId,
        [FromQuery] DateTimeOffset? from,
        [FromQuery] DateTimeOffset? until,
        CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var query = db.Nodes
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .Where(n => n.FamilyId == familyId);

        query = type switch
        {
            ContractNodeType.Note => query.Where(n => n is Note),
            ContractNodeType.Task => query.Where(n => n is TaskNode),
            ContractNodeType.Appointment => query.Where(n => n is Appointment),
            ContractNodeType.Contact => query.Where(n => n is Contact),
            _ => query,
        };

        if (assignedTo is { } familyMemberId)
        {
            query = query.Where(n => n.Assignments.Any(a => a.FamilyMemberId == familyMemberId));
        }

        if (collectionId is { } collectionIdValue)
        {
            query = query.Where(n => n.CollectionId == collectionIdValue);
        }

        if (from is { } fromValue)
        {
            query = query.Where(n => n.Until != null ? n.Until >= fromValue : n.From == null || n.From >= fromValue);
        }

        if (until is { } untilValue)
        {
            query = query.Where(n => n.From == null || n.From <= untilValue);
        }

        var nodes = await query.ToListAsync(cancellationToken);
        return Ok(nodes.Select(ToResponse).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<NodeResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var node = await db.Nodes
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);

        return node is null ? NotFound() : Ok(ToResponse(node));
    }

    [HttpPost]
    public async Task<ActionResult<NodeResponse>> Create(CreateNodeRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var assignedIds = await ValidateFamilyMemberIds(familyId, request.AssignedFamilyMemberIds, cancellationToken);
        if (assignedIds is null) return InvalidAssigneesProblem();

        if (!await IsValidCollectionId(familyId, request.CollectionId, cancellationToken)) return InvalidCollectionProblem();

        if (request.Type == ContractNodeType.Contact && string.IsNullOrWhiteSpace(request.FirstName))
        {
            return InvalidContactProblem();
        }

        var now = DateTimeOffset.UtcNow;
        Node node = request.Type switch
        {
            ContractNodeType.Note => new Note { Title = request.Title },
            ContractNodeType.Task => new TaskNode { Title = request.Title, Priority = request.Priority },
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
        node.CreatedByUserId = CurrentUserId;
        node.Assignments = assignedIds.Select(memberId => new NodeAssignment { FamilyMemberId = memberId }).ToList();

        db.Nodes.Add(node);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = node.Id }, ToResponse(node));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<NodeResponse>> Update(Guid id, UpdateNodeRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var node = await db.Nodes
            .Include(n => n.Assignments)
            .Include(n => ((Contact)n).PhoneNumbers)
            .Include(n => ((Contact)n).Emails)
            .FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);
        if (node is null) return NotFound();

        var assignedIds = await ValidateFamilyMemberIds(familyId, request.AssignedFamilyMemberIds, cancellationToken);
        if (assignedIds is null) return InvalidAssigneesProblem();

        if (!await IsValidCollectionId(familyId, request.CollectionId, cancellationToken)) return InvalidCollectionProblem();

        if (node is Contact && string.IsNullOrWhiteSpace(request.FirstName))
        {
            return InvalidContactProblem();
        }

        node.Title = request.Title;
        node.Description = request.Description;
        node.From = request.From;
        node.Until = request.Until;
        node.CollectionId = request.CollectionId;
        node.UpdatedAt = DateTimeOffset.UtcNow;

        switch (node)
        {
            case TaskNode task:
                if (request.IsCompleted is { } isCompleted)
                {
                    task.IsCompleted = isCompleted;
                    task.CompletedAt = isCompleted ? task.CompletedAt ?? DateTimeOffset.UtcNow : null;
                }
                task.Priority = request.Priority;
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

        return Ok(ToResponse(node));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var node = await db.Nodes.FirstOrDefaultAsync(n => n.FamilyId == familyId && n.Id == id, cancellationToken);
        if (node is null) return NotFound();

        db.Nodes.Remove(node);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
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

    private async Task<bool> IsValidCollectionId(Guid familyId, Guid? collectionId, CancellationToken cancellationToken)
    {
        if (collectionId is not { } id) return true;
        return await db.Collections.AnyAsync(c => c.FamilyId == familyId && c.Id == id, cancellationToken);
    }

    private ObjectResult InvalidAssigneesProblem() => Problem(
        title: "Invalid assignee",
        detail: "One or more AssignedFamilyMemberIds don't belong to this Family.",
        statusCode: StatusCodes.Status400BadRequest);

    private ObjectResult InvalidCollectionProblem() => Problem(
        title: "Invalid collection",
        detail: "CollectionId doesn't belong to this Family.",
        statusCode: StatusCodes.Status400BadRequest);

    private ObjectResult InvalidContactProblem() => Problem(
        title: "Invalid contact",
        detail: "A Contact requires a FirstName.",
        statusCode: StatusCodes.Status400BadRequest);

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
                task.IsCompleted, task.CompletedAt, task.Priority,
                Location: null, AllDay: null, RecurrenceRule: null,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
            Appointment appointment => new NodeResponse(
                appointment.Id, ContractNodeType.Appointment, appointment.Title, appointment.Description, appointment.From, appointment.Until,
                appointment.CreatedAt, appointment.UpdatedAt, appointment.CreatedByUserId, assignedIds, appointment.CollectionId,
                IsCompleted: null, CompletedAt: null, Priority: null,
                appointment.Location, appointment.AllDay, appointment.RecurrenceRule,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
            Contact contact => new NodeResponse(
                contact.Id, ContractNodeType.Contact, contact.Title, contact.Description, contact.From, contact.Until,
                contact.CreatedAt, contact.UpdatedAt, contact.CreatedByUserId, assignedIds, contact.CollectionId,
                IsCompleted: null, CompletedAt: null, Priority: null,
                Location: null, AllDay: null, RecurrenceRule: null,
                contact.FirstName, contact.LastName, contact.DateOfBirth,
                contact.Street, contact.City, contact.PostalCode, contact.Country,
                contact.PhoneNumbers.Select(p => new ContactPhoneNumberDto(p.Number, p.Label)).ToList(),
                contact.Emails.Select(e => new ContactEmailDto(e.Email, e.Label)).ToList()),
            _ => new NodeResponse(
                node.Id, ContractNodeType.Note, node.Title, node.Description, node.From, node.Until,
                node.CreatedAt, node.UpdatedAt, node.CreatedByUserId, assignedIds, node.CollectionId,
                IsCompleted: null, CompletedAt: null, Priority: null,
                Location: null, AllDay: null, RecurrenceRule: null,
                FirstName: null, LastName: null, DateOfBirth: null,
                Street: null, City: null, PostalCode: null, Country: null,
                PhoneNumbers: [], Emails: []),
        };
    }
}
