using Corkboard.Api.Auth;
using Corkboard.Contracts.Auth;
using Corkboard.Contracts.Setup;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Api.Controllers;

[ApiController]
[Route("api/setup")]
public class SetupController(
    CorkboardDbContext db,
    UserManager<ApplicationUser> userManager,
    ITokenService tokenService,
    IWebHostEnvironment env) : ControllerBase
{
    private const string DevSeedEmail = "dev@corkboard.test";
    private const string DevSeedPassword = "devpassword";

    /// <summary>
    /// Whether this Corkboard instance already has a Family set up. Drives the
    /// client's first-run wizard framing on the login page — once a Family
    /// exists, the client behaves like an ordinary login screen. Anonymous
    /// since the client needs this before anyone can authenticate.
    /// </summary>
    [HttpGet("status")]
    [AllowAnonymous]
    public async Task<ActionResult<SetupStatusResponse>> Status(CancellationToken cancellationToken)
    {
        var isConfigured = await db.Families.AnyAsync(cancellationToken);
        return Ok(new SetupStatusResponse(isConfigured));
    }

    /// <summary>
    /// Dev-only convenience for local/manual testing: seeds one Family (a couple
    /// of FamilyMembers, a TaskList with a few Tasks, and a Note) with an Owner
    /// login, and logs straight into it — a stand-in for clicking through the
    /// first-run wizard by hand every time the dev database is reset. Idempotent:
    /// calling it again just logs back into the same seeded Family rather than
    /// creating a second one. Not reachable outside Development (see Program.cs's
    /// equivalent gate on the TickerQ dashboard).
    /// </summary>
    [HttpPost("seed-dev-data")]
    [AllowAnonymous]
    public async Task<ActionResult<AuthResponse>> SeedDevData(CancellationToken cancellationToken)
    {
        if (!env.IsDevelopment()) return NotFound();

        var existingUser = await userManager.FindByEmailAsync(DevSeedEmail);
        if (existingUser is not null)
        {
            return Ok(await tokenService.CreateTokenAsync(existingUser, cancellationToken));
        }

        var owner = new ApplicationUser { UserName = DevSeedEmail, Email = DevSeedEmail };
        var createResult = await userManager.CreateAsync(owner, DevSeedPassword);
        if (!createResult.Succeeded)
        {
            foreach (var error in createResult.Errors)
            {
                ModelState.AddModelError(error.Code, error.Description);
            }

            return ValidationProblem(ModelState);
        }

        var now = DateTimeOffset.UtcNow;
        var family = new Family
        {
            Id = Guid.NewGuid(),
            Name = "Dev Family",
            TimeZone = "Europe/Amsterdam",
            CreatedAt = now,
        };
        db.Families.Add(family);
        db.UserFamilies.Add(new UserFamily { UserId = owner.Id, FamilyId = family.Id, Role = FamilyRole.Owner });

        var ownerMember = new FamilyMember { Id = Guid.NewGuid(), FamilyId = family.Id, DisplayName = "Dev Owner", Color = "#ec5542", LinkedUserId = owner.Id };
        var member2 = new FamilyMember { Id = Guid.NewGuid(), FamilyId = family.Id, DisplayName = "Sam", Color = "#2a80e2" };
        var member3 = new FamilyMember { Id = Guid.NewGuid(), FamilyId = family.Id, DisplayName = "Robin", Color = "#1eab53" };
        db.FamilyMembers.AddRange(ownerMember, member2, member3);

        var taskList = new Collection
        {
            Id = Guid.NewGuid(),
            FamilyId = family.Id,
            Name = "Groceries",
            Type = CollectionType.TaskList,
            Color = "#ec5542",
            CreatedAt = now,
            UpdatedAt = now,
            CreatedByUserId = owner.Id,
        };
        db.Collections.Add(taskList);

        db.Nodes.AddRange(
            new TaskNode
            {
                Id = Guid.NewGuid(),
                FamilyId = family.Id,
                Title = "Buy milk",
                CollectionId = taskList.Id,
                Until = now.AddDays(1),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = owner.Id,
                Assignments = [new NodeAssignment { FamilyMemberId = ownerMember.Id }],
            },
            new TaskNode
            {
                Id = Guid.NewGuid(),
                FamilyId = family.Id,
                Title = "Pay the rent",
                CollectionId = taskList.Id,
                Until = now.AddDays(-1),
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = owner.Id,
                Assignments = [new NodeAssignment { FamilyMemberId = member2.Id }],
            },
            new Note
            {
                Id = Guid.NewGuid(),
                FamilyId = family.Id,
                Title = "Wifi password",
                Description = "CorkboardWifi2024",
                IsImportant = true,
                CreatedAt = now,
                UpdatedAt = now,
                CreatedByUserId = owner.Id,
                Assignments = [new NodeAssignment { FamilyMemberId = member3.Id }],
            });

        await db.SaveChangesAsync(cancellationToken);

        var auth = await tokenService.CreateTokenAsync(owner, cancellationToken);
        return Ok(auth);
    }
}
