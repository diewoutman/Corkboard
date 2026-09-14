using Corkboard.Api.Common;
using Corkboard.Contracts.FamilyMembers;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/family-members")]
public class FamilyMembersController(CorkboardDbContext db) : FamilyScopedControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<FamilyMemberResponse>>> List(CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var members = await db.FamilyMembers
            .AsNoTracking()
            .Where(m => m.FamilyId == familyId)
            .Select(ToResponse)
            .ToListAsync(cancellationToken);

        return Ok(members);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Get(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers
            .AsNoTracking()
            .Where(m => m.FamilyId == familyId && m.Id == id)
            .Select(ToResponse)
            .FirstOrDefaultAsync(cancellationToken);

        return member is null ? NotFound() : Ok(member);
    }

    [HttpPost]
    public async Task<ActionResult<FamilyMemberResponse>> Create(CreateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = new FamilyMember
        {
            Id = Guid.NewGuid(),
            FamilyId = familyId,
            DisplayName = request.DisplayName,
            Color = request.Color,
            AvatarUrl = request.AvatarUrl,
            LinkedUserId = request.LinkedUserId,
            DateOfBirth = request.DateOfBirth,
        };

        db.FamilyMembers.Add(member);
        await db.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(Get), new { id = member.Id }, ToResponseValue(member));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<FamilyMemberResponse>> Update(Guid id, UpdateFamilyMemberRequest request, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        member.DisplayName = request.DisplayName;
        member.Color = request.Color;
        member.AvatarUrl = request.AvatarUrl;
        member.LinkedUserId = request.LinkedUserId;
        member.DateOfBirth = request.DateOfBirth;

        await db.SaveChangesAsync(cancellationToken);

        return Ok(ToResponseValue(member));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        if (CurrentFamilyId is not { } familyId) return NoFamilyProblem();

        var member = await db.FamilyMembers.FirstOrDefaultAsync(m => m.FamilyId == familyId && m.Id == id, cancellationToken);
        if (member is null) return NotFound();

        db.FamilyMembers.Remove(member);
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }

    private static readonly System.Linq.Expressions.Expression<Func<FamilyMember, FamilyMemberResponse>> ToResponse =
        m => new FamilyMemberResponse(m.Id, m.DisplayName, m.Color, m.AvatarUrl, m.LinkedUserId, m.DateOfBirth);

    private static FamilyMemberResponse ToResponseValue(FamilyMember m) =>
        new(m.Id, m.DisplayName, m.Color, m.AvatarUrl, m.LinkedUserId, m.DateOfBirth);
}
