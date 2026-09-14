namespace Corkboard.Domain.Entities;

/// <summary>
/// The assignable person — who a Node gets assigned to, and who shows up on the
/// board/calendar. Optionally linked to a User for members old enough to log in;
/// kids or other non-login members can exist without one.
/// </summary>
public class FamilyMember
{
    public Guid Id { get; set; }

    public Guid FamilyId { get; set; }
    public Family Family { get; set; } = null!;

    public required string DisplayName { get; set; }

    /// <summary>Color-coding for calendar/board, e.g. a hex string.</summary>
    public required string Color { get; set; }

    public string? AvatarUrl { get; set; }

    /// <summary>Nullable FK to an Identity User; see <see cref="UserFamily"/> for why this isn't a navigation property.</summary>
    public Guid? LinkedUserId { get; set; }

    public DateOnly? DateOfBirth { get; set; }

    public List<NodeAssignment> NodeAssignments { get; set; } = [];
}
