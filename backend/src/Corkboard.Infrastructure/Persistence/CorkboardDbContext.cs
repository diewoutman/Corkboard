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
    public DbSet<Contact> Contacts => Set<Contact>();
    public DbSet<ContactPhoneNumber> ContactPhoneNumbers => Set<ContactPhoneNumber>();
    public DbSet<ContactEmail> ContactEmails => Set<ContactEmail>();

    public DbSet<NodeAssignment> NodeAssignments => Set<NodeAssignment>();

    public DbSet<Collection> Collections => Set<Collection>();
    public DbSet<CollectionAddress> CollectionAddresses => Set<CollectionAddress>();

    public DbSet<DashboardWidget> DashboardWidgets => Set<DashboardWidget>();

    public DbSet<ApiClient> ApiClients => Set<ApiClient>();
    public DbSet<ApiCallLog> ApiCallLogs => Set<ApiCallLog>();

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

            // Deleting a Collection (e.g. a Task list) deletes the Nodes in it —
            // matches the expected "delete this list" behavior.
            entity.HasOne(n => n.Collection)
                .WithMany(c => c.Nodes)
                .HasForeignKey(n => n.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(n => n.CollectionId);

            entity.HasDiscriminator<string>("NodeType")
                .HasValue<Note>("Note")
                .HasValue<TaskNode>("Task")
                .HasValue<Appointment>("Appointment")
                .HasValue<Contact>("Contact");
        });

        builder.Entity<Collection>(entity =>
        {
            entity.HasOne(c => c.Family)
                .WithMany()
                .HasForeignKey(c => c.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(c => new { c.FamilyId, c.Type });

            // A parent Collection can't be deleted while it still has children —
            // avoids silently orphaning or cascading through a whole subtree.
            entity.HasOne(c => c.ParentCollection)
                .WithMany(c => c.ChildCollections)
                .HasForeignKey(c => c.ParentCollectionId)
                .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(c => c.FeedToken).IsUnique().HasFilter("\"FeedToken\" IS NOT NULL");
        });

        builder.Entity<CollectionAddress>(entity =>
        {
            entity.HasKey(a => a.CollectionId);
            entity.HasOne(a => a.Collection)
                .WithOne(c => c.Address)
                .HasForeignKey<CollectionAddress>(a => a.CollectionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<AppointmentException>(entity =>
        {
            entity.HasOne(e => e.Appointment)
                .WithMany(a => a.Exceptions)
                .HasForeignKey(e => e.AppointmentId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(e => new { e.AppointmentId, e.OriginalOccurrenceDate }).IsUnique();
        });

        builder.Entity<ContactPhoneNumber>(entity =>
        {
            entity.HasOne(p => p.Contact)
                .WithMany(c => c.PhoneNumbers)
                .HasForeignKey(p => p.ContactId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<ContactEmail>(entity =>
        {
            entity.HasOne(e => e.Contact)
                .WithMany(c => c.Emails)
                .HasForeignKey(e => e.ContactId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        builder.Entity<DashboardWidget>(entity =>
        {
            entity.HasOne(w => w.Family)
                .WithMany()
                .HasForeignKey(w => w.FamilyId)
                .OnDelete(DeleteBehavior.Cascade);
            entity.HasIndex(w => new { w.UserId, w.FamilyId, w.Scope, w.SortOrder });
            entity.HasIndex(w => new { w.FamilyId, w.Scope, w.SortOrder });
            entity.Property(w => w.Config).HasColumnType("jsonb");
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

        builder.Entity<ApiClient>(entity =>
        {
            entity.HasIndex(c => c.ClientId).IsUnique();
        });

        builder.Entity<ApiCallLog>(entity =>
        {
            entity.HasOne(l => l.ApiClient)
                .WithMany()
                .HasForeignKey(l => l.ApiClientId)
                .OnDelete(DeleteBehavior.Cascade);
            // Cleanup job scans/deletes by Timestamp; the per-client log view filters by ApiClientId+Timestamp.
            entity.HasIndex(l => l.Timestamp);
            entity.HasIndex(l => new { l.ApiClientId, l.Timestamp });
        });
    }
}
