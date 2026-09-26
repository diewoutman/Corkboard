namespace Corkboard.Domain.Entities;

/// <summary>
/// What a Collection means to the user — Collection itself is a backend-only
/// grouping concept (like Node), never surfaced by name. "A Task list is a
/// Collection of Task Nodes"; "a Calendar is a Collection of Appointment Nodes".
/// Schedule is also a Collection of Appointment Nodes — same shape as Calendar,
/// just filled in through a dedicated weekly (day-of-week × time) editor instead
/// of one-off dated events, and rendered as just another togglable layer in the
/// calendar grid (see CalendarPage) rather than a separate view.
/// Household is a Collection of Contact Nodes — groups related Contacts (e.g. a
/// child and their parents) so they can share one address instead of each
/// Contact repeating it; see Collection.Street/City/PostalCode/Country.
/// RecipeBook is a Collection of Recipe Nodes — a folder of recipes, nestable
/// under a parent RecipeBook via the existing ParentCollectionId tree (the first
/// UI to actually expose that nesting). MealPlan is a Collection of Meal Nodes —
/// exactly one per Family, auto-created like the Personal Inbox.
/// </summary>
public enum CollectionType
{
    TaskList,
    Calendar,
    Schedule,
    Household,
    RecipeBook,
    MealPlan,
}
