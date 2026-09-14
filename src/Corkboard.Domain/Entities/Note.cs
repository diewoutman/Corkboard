namespace Corkboard.Domain.Entities;

public class Note : Node
{
    /// <summary>Lets the dashboard's Notes widget filter down to just what matters right now.</summary>
    public bool IsImportant { get; set; }
}
