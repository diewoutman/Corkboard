namespace Corkboard.Contracts.ApiClients;

/// <summary>
/// The full set of grantable scope names, mirroring the existing family-scoped
/// controller/feature boundaries. Contacts are a Node subtype served by
/// NodesController (there's no dedicated ContactsController), so they fold into
/// the "nodes" scope rather than getting their own. Each area has a :read and a
/// :write scope — see RequireScopeAttribute for how these gate a request.
/// </summary>
public static class ApiScopes
{
    public const string Nodes = "nodes";
    public const string Calendar = "calendar";
    public const string Collections = "collections";
    public const string Dashboard = "dashboard";
    public const string Family = "family";

    public static readonly string[] Areas = [Nodes, Calendar, Collections, Dashboard, Family];

    public static readonly string[] All = Areas.SelectMany(area => new[] { Read(area), Write(area) }).ToArray();

    public static string Read(string area) => $"{area}:read";

    public static string Write(string area) => $"{area}:write";
}
