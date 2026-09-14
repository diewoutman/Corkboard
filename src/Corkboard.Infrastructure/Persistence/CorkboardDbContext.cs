using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Corkboard.Infrastructure.Persistence;

/// <summary>
/// Also hosts TickerQ's persisted job tables — see Program.cs, where
/// AddOperationalStore(o => o.UseApplicationDbContext&lt;CorkboardDbContext&gt;(...))
/// swaps in TickerQ's model customizer rather than requiring manual
/// OnModelCreating wiring here.
/// </summary>
public class CorkboardDbContext(DbContextOptions<CorkboardDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole<Guid>, Guid>(options)
{
    public DbSet<Family> Families => Set<Family>();
    public DbSet<UserFamily> UserFamilies => Set<UserFamily>();
    public DbSet<FamilyMember> FamilyMembers => Set<FamilyMember>();

    public DbSet<Node> Nodes => Set<Node>();
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<TaskNode> TaskNodes => Set<TaskNode>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<AppointmentException> AppointmentExceptions => Set<AppointmentException>();

    public DbSet<NodeAssignment> NodeAssignments => Set<NodeAssignment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Family>(entity =>
        {
            entity.HasIndex(f => f.Name);
        });

        builder.Entity<UserFamily>(entity =>
        {
            entity.HasKey(uf => new { uf.UserId, uf.FamilyId });
            entity.HasOne(uf => uf.Family)
                .WithMany(f => f.UserFamilies)
                .HasForeignKey(uf => uf.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<FamilyMember>(entity =>
        {
            entity.HasOne(m => m.Family)
                .WithMany(f => f.Members)
                .HasForeignKey(m => m.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(m => m.FamilyId);
        });

        builder.Entity<Node>(entity =>
        {
            entity.HasOne(n => n.Family)
                .WithMany()
                .HasForeignKey(n => n.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(n => n.FamilyId);
            entity.HasIndex(n => new { n.FamilyId, n.From, n.Until });

            entity.HasDiscriminator<string>("NodeType")
                .HasValue<Note>("Note")
                .HasValue<TaskNode>("Task")
                .HasValue<Appointment>("Appointment");
        });

        builder.Entity<AppointmentException>(entity =>
        {
            entity.HasOne(e => e.Appointment)
                .WithMany(a => a.Exceptions)
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AppointmentId, e.OriginalOccurrenceDate }).IsUnique();
        });

        builder.Entity<NodeAssignment>(entity =>
        {
            entity.HasKey(a => new { a.NodeId, a.FamilyMemberId });
            entity.HasOne(a => a.Node)
                .WithMany(n => n.Assignments)
                .HasForeignKey(a => a.NodeId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasOne(a => a.FamilyMember)
                .WithMany(m => m.NodeAssignments)
                .HasForeignKey(a => a.FamilyMemberId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
