namespace Corkboard.Domain.Entities;

/// <summary>
/// Who a Collection belongs to. Family is shared with the whole family; Personal
/// is visible to (and only to) <see cref="Collection.OwnerUserId"/>.
/// </summary>
public enum CollectionScope
{
    Family,
    Personal,
}
