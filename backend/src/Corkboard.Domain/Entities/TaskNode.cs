namespace Corkboard.Domain.Entities;

/// <summary>Named TaskNode (not Task) to avoid colliding with System.Threading.Tasks.Task.</summary>
public class TaskNode : Node
{
    public bool IsCompleted { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
    public int? Priority { get; set; }

    /// <summary>Optional Section (Todoist-style category) within the Task's Collection.</summary>
    public Guid? SectionId { get; set; }
    public Section? Section { get; set; }

    /// <summary>
    /// Set only for items on the system-managed shopping list — an ingredient
    /// carried over from a Meal (see MealPlanService.AddToShoppingListAsync).
    /// Null for an ordinary Task, or a shopping item added by hand with no amount.
    /// </summary>
    public decimal? Quantity { get; set; }
    public IngredientUnit? Unit { get; set; }

    /// <summary>
    /// Computed server-side from Title the same way as RecipeIngredient.NormalizedName —
    /// only meaningful for shopping-list items, used to merge a newly added ingredient
    /// into an existing line with the same (NormalizedName, Unit).
    /// </summary>
    public string? NormalizedName { get; set; }

    /// <summary>
    /// Same RRULE format and column as Appointment.RecurrenceRule (TPH siblings
    /// sharing one "RecurrenceRule" column — only one of the two types applies
    /// per row, per NodeType). Unlike Appointment, a Task isn't expanded into
    /// multiple occurrences: completing a recurring Task just rolls Until
    /// forward to the next occurrence instead of completing it — see
    /// NodesController.Update.
    /// </summary>
    public string? RecurrenceRule { get; set; }
}
