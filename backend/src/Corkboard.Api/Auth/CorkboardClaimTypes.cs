namespace Corkboard.Api.Auth;

public static class CorkboardClaimTypes
{
    public const string FamilyId = "family_id";
    public const string FamilyRole = "family_role";

    /// <summary>Present only on a human user's token, when ApplicationUser.IsSystemOwner is true.</summary>
    public const string SystemOwner = "system_owner";

    /// <summary>Present only on a client-credentials token — see ApiClientsController/TokenService.CreateClientTokenAsync.</summary>
    public const string ClientId = "client_id";

    /// <summary>Space-delimited scope list, present only on a client-credentials token.</summary>
    public const string Scope = "scope";
}
