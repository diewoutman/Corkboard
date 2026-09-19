using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Auth;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Corkboard.Api.Auth;

public interface ITokenService
{
    Task<AuthResponse> CreateTokenAsync(ApplicationUser user, CancellationToken cancellationToken = default);

    /// <summary>Client-credentials grant — mints a scoped token for an ApiClient rather than a human user.</summary>
    Task<ApiClientTokenResponse> CreateClientTokenAsync(ApiClient client, CancellationToken cancellationToken = default);
}

public class TokenService(CorkboardDbContext db, IOptions<JwtOptions> jwtOptions) : ITokenService
{
    private readonly JwtOptions _options = jwtOptions.Value;

    public async Task<AuthResponse> CreateTokenAsync(ApplicationUser user, CancellationToken cancellationToken = default)
    {
        // A user may in principle belong to more than one Family (see UserFamily's
        // doc comment), but the token only carries one — the client targets a
        // single family for now. Revisit if/when family-switching UI exists.
        var membership = await db.UserFamilies
            .AsNoTracking()
            .Where(uf => uf.UserId == user.Id)
            .Select(uf => new { uf.FamilyId, uf.Role })
            .FirstOrDefaultAsync(cancellationToken);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        if (membership is not null)
        {
            claims.Add(new Claim(CorkboardClaimTypes.FamilyId, membership.FamilyId.ToString()));
            claims.Add(new Claim(CorkboardClaimTypes.FamilyRole, membership.Role.ToString()));
        }

        if (user.IsSystemOwner)
        {
            claims.Add(new Claim(CorkboardClaimTypes.SystemOwner, "true"));
        }

        // Ties this human login to the GUI's own first-party ApiClient row (seeded
        // at startup, see Program.cs) — gives it a client identity for the API-clients
        // call log without a Scope claim, so RequireScopeAttribute still leaves it alone.
        var firstPartyClientId = await db.ApiClients.Where(c => c.IsFirstParty).Select(c => c.Id).FirstOrDefaultAsync(cancellationToken);
        if (firstPartyClientId != Guid.Empty)
        {
            claims.Add(new Claim(CorkboardClaimTypes.ClientId, firstPartyClientId.ToString()));
        }

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.ExpiryMinutes);
        var tokenString = WriteToken(claims, expiresAt);

        return new AuthResponse(
            tokenString,
            expiresAt,
            user.Id,
            user.Email ?? string.Empty,
            membership?.FamilyId,
            membership?.Role.ToString(),
            user.IsSystemOwner);
    }

    public async Task<ApiClientTokenResponse> CreateClientTokenAsync(ApiClient client, CancellationToken cancellationToken = default)
    {
        var scopes = client.Scopes.Split(' ', StringSplitOptions.RemoveEmptyEntries);

        // Resource controllers (NodesController etc.) still key every query off a
        // FamilyId claim — ApiClient itself is instance-wide, so resolve the (sole,
        // in practice — CONCEPT.md §1/§2.1) Family here at mint time instead.
        var familyId = await db.Families.Select(f => f.Id).FirstOrDefaultAsync(cancellationToken);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, client.Id.ToString()),
            new(ClaimTypes.NameIdentifier, client.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new(CorkboardClaimTypes.ClientId, client.Id.ToString()),
            new(CorkboardClaimTypes.Scope, client.Scopes),
        };

        if (familyId != Guid.Empty)
        {
            claims.Add(new Claim(CorkboardClaimTypes.FamilyId, familyId.ToString()));
        }

        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.ClientExpiryMinutes);
        var tokenString = WriteToken(claims, expiresAt);

        return new ApiClientTokenResponse(tokenString, expiresAt, scopes);
    }

    private string WriteToken(IEnumerable<Claim> claims, DateTimeOffset expiresAt)
    {
        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
