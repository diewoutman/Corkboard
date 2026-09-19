using Corkboard.Api.Auth;
using Corkboard.Api.Controllers;
using Corkboard.Contracts.Auth;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Corkboard.Api.Tests;

/// <summary>
/// Builds a real UserManager&lt;ApplicationUser&gt; (backed by the in-memory EF
/// provider) rather than mocking it — lockout is implemented by Identity's own
/// AccessFailedCount/LockoutEnd bookkeeping (see AuthController.Login), so a mock
/// would just be re-asserting whatever the test told it to return.
/// </summary>
public class AuthControllerTests : IDisposable
{
    private readonly ServiceProvider _provider;
    private readonly IServiceScope _scope;

    public AuthControllerTests()
    {
        var services = new ServiceCollection();
        services.AddDbContext<CorkboardDbContext>(o => o.UseInMemoryDatabase(Guid.NewGuid().ToString()));
        services
            .AddIdentityCore<ApplicationUser>(options =>
            {
                // Mirrors Program.cs's Identity configuration.
                options.Password.RequireDigit = false;
                options.Password.RequireLowercase = false;
                options.Password.RequireUppercase = false;
                options.Password.RequireNonAlphanumeric = false;
                options.Password.RequiredLength = 6;

                options.Lockout.AllowedForNewUsers = true;
                options.Lockout.MaxFailedAccessAttempts = 5;
                options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
            })
            .AddRoles<IdentityRole<Guid>>()
            .AddEntityFrameworkStores<CorkboardDbContext>()
            .AddDefaultTokenProviders();
        services.AddLogging();
        services.AddDataProtection();

        _provider = services.BuildServiceProvider();
        _scope = _provider.CreateScope();
    }

    public void Dispose()
    {
        _scope.Dispose();
        _provider.Dispose();
    }

    private CorkboardDbContext Db => _scope.ServiceProvider.GetRequiredService<CorkboardDbContext>();

    private UserManager<ApplicationUser> UserManager => _scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();

    private static ITokenService TestTokenService(CorkboardDbContext db) => new TokenService(
        db,
        Options.Create(new JwtOptions
        {
            Issuer = "test-issuer",
            Audience = "test-audience",
            SigningKey = "unit-test-signing-key-at-least-32-bytes-long",
        }));

    private AuthController CreateController() => new(Db, UserManager, TestTokenService(Db));

    [Fact]
    public async Task Register_grants_the_first_user_system_owner_and_returns_a_token()
    {
        var controller = CreateController();

        var result = await controller.Register(new RegisterRequest("owner@example.com", "password1"), CancellationToken.None);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var response = Assert.IsType<AuthResponse>(created.Value);
        Assert.True(response.IsSystemOwner);
        Assert.False(string.IsNullOrEmpty(response.Token));
    }

    [Fact]
    public async Task Register_is_closed_once_a_family_exists()
    {
        var db = Db;
        db.Families.Add(new Family { Id = Guid.NewGuid(), Name = "Existing", TimeZone = "Europe/Amsterdam", CreatedAt = DateTimeOffset.UtcNow });
        await db.SaveChangesAsync();

        var controller = CreateController();
        var result = await controller.Register(new RegisterRequest("stranger@example.com", "password1"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status403Forbidden, problem.StatusCode);
    }

    [Fact]
    public async Task Login_succeeds_with_the_right_password()
    {
        var controller = CreateController();
        await controller.Register(new RegisterRequest("owner@example.com", "correct-password"), CancellationToken.None);

        var result = await controller.Login(new LoginRequest("owner@example.com", "correct-password"), CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.IsType<AuthResponse>(ok.Value);
    }

    [Fact]
    public async Task Login_rejects_a_wrong_password_without_leaking_whether_the_account_exists()
    {
        var controller = CreateController();
        await controller.Register(new RegisterRequest("owner@example.com", "correct-password"), CancellationToken.None);

        var wrongPassword = await controller.Login(new LoginRequest("owner@example.com", "wrong-password"), CancellationToken.None);
        var unknownEmail = await controller.Login(new LoginRequest("nobody@example.com", "whatever1"), CancellationToken.None);

        var wrongPasswordProblem = Assert.IsType<ObjectResult>(wrongPassword.Result);
        var unknownEmailProblem = Assert.IsType<ObjectResult>(unknownEmail.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, wrongPasswordProblem.StatusCode);
        Assert.Equal(StatusCodes.Status401Unauthorized, unknownEmailProblem.StatusCode);
        Assert.Equal(
            ((ProblemDetails)wrongPasswordProblem.Value!).Title,
            ((ProblemDetails)unknownEmailProblem.Value!).Title);
    }

    /// <summary>
    /// A classic SQL-injection-style payload in the email field. There's no raw
    /// SQL anywhere in this codebase (EF Core LINQ throughout, parameterized at
    /// the Npgsql level), so this should behave exactly like any other wrong
    /// login: rejected, not authenticated, no exception.
    /// </summary>
    [Fact]
    public async Task Login_treats_a_SQL_injection_style_email_as_an_ordinary_nonexistent_user()
    {
        var controller = CreateController();
        await controller.Register(new RegisterRequest("owner@example.com", "correct-password"), CancellationToken.None);

        var result = await controller.Login(
            new LoginRequest("' OR '1'='1", "' OR '1'='1"),
            CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
    }

    [Fact]
    public async Task Login_locks_the_account_out_after_repeated_failed_attempts()
    {
        var controller = CreateController();
        await controller.Register(new RegisterRequest("owner@example.com", "correct-password"), CancellationToken.None);

        // MaxFailedAccessAttempts is 5 — the 5th wrong attempt trips the lockout.
        for (var i = 0; i < 5; i++)
        {
            await controller.Login(new LoginRequest("owner@example.com", "wrong-password"), CancellationToken.None);
        }

        // Even the correct password is now refused while locked out.
        var lockedOut = await controller.Login(new LoginRequest("owner@example.com", "correct-password"), CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(lockedOut.Result);
        var details = Assert.IsType<ProblemDetails>(problem.Value);
        Assert.Equal(StatusCodes.Status401Unauthorized, problem.StatusCode);
        Assert.Equal("Account temporarily locked", details.Title);
    }

    [Fact]
    public async Task Login_resets_the_failed_attempt_count_after_a_successful_login()
    {
        var controller = CreateController();
        await controller.Register(new RegisterRequest("owner@example.com", "correct-password"), CancellationToken.None);

        for (var i = 0; i < 4; i++)
        {
            await controller.Login(new LoginRequest("owner@example.com", "wrong-password"), CancellationToken.None);
        }

        var recovered = await controller.Login(new LoginRequest("owner@example.com", "correct-password"), CancellationToken.None);
        Assert.IsType<OkObjectResult>(recovered.Result);

        var user = await UserManager.FindByEmailAsync("owner@example.com");
        Assert.Equal(0, user!.AccessFailedCount);
    }
}
