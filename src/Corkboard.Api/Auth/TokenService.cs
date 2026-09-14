using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Corkboard.Contracts.Auth;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Corkboard.Api.Auth;

public interface ITokenService
{
    Task<AuthResponse> CreateTokenAsync(ApplicationUser user, CancellationToken cancellationToken = default);
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

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTimeOffset.UtcNow.AddMinutes(_options.ExpiryMinutes);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);

        return new AuthResponse(
            tokenString,
            expiresAt,
            user.Id,
            user.Email ?? string.Empty,
            membership?.FamilyId,
            membership?.Role.ToString());
    }
}
