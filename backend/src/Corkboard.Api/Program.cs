using System.Text;
using System.Text.Json.Serialization;
using System.Threading.RateLimiting;
using Corkboard.Api.Auth;
using Corkboard.Api.Common;
using Corkboard.Api.Jobs;
using Corkboard.Application.Admin;
using Corkboard.Application.ApiClients;
using Corkboard.Application.Calendar;
using Corkboard.Application.Collections;
using Corkboard.Application.Dashboard;
using Corkboard.Application.Families;
using Corkboard.Application.FamilyMembers;
using Corkboard.Application.MealPlan;
using Corkboard.Application.Nodes;
using Corkboard.Application.Notifications;
using Corkboard.Application.Recipes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Ics;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using TickerQ.Dashboard.DependencyInjection;
using TickerQ.DependencyInjection;
using TickerQ.EntityFrameworkCore.Customizer;
using TickerQ.EntityFrameworkCore.DependencyInjection;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

// The Angular client sends/expects enums as their string names (e.g. "Note"),
// not the default numeric encoding.
builder.Services.AddControllers()
    .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Gives every error response — including an unhandled exception, via
// UseExceptionHandler() below — a consistent RFC 7807 ProblemDetails body
// instead of only the ones that already call Problem()/ValidationProblem().
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<CorkboardDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

builder.Services
    .AddIdentityCore<ApplicationUser>(options =>
    {
        options.User.RequireUniqueEmail = true;
        // Default Identity password policy (upper+lower+digit+special char) is
        // enterprise-grade friction for a personal family app, and didn't match
        // what the client's own form actually validates (length >= 6 only).
        options.Password.RequireDigit = false;
        options.Password.RequireLowercase = false;
        options.Password.RequireUppercase = false;
        options.Password.RequireNonAlphanumeric = false;
        options.Password.RequiredLength = 6;

        // Brute-force protection: after repeated wrong passwords, lock the account
        // out for a while rather than letting an attacker keep guessing forever.
        // Enforced manually in AuthController.Login (this app mints its own JWTs
        // via UserManager directly rather than going through SignInManager).
        options.Lockout.AllowedForNewUsers = true;
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(15);
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<CorkboardDbContext>()
    .AddDefaultTokenProviders();

var jwtSection = builder.Configuration.GetSection("Jwt");

// Fail fast on a signing key that's missing, too short for HMAC-SHA256 (< 32
// bytes/256 bits), or still the placeholder checked into appsettings.json — any
// of those means every JWT this instance issues is forgeable. Only a hard
// failure outside Development: the repo ships the placeholder as-is (no
// appsettings.Development.json override), so failing here too would break
// `dev.sh`/Playwright out of the box.
const string PlaceholderSigningKey = "REPLACE_WITH_A_GENERATED_SECRET_AT_LEAST_32_BYTES_LONG";
var jwtSigningKey = jwtSection["SigningKey"] ?? throw new InvalidOperationException("Jwt:SigningKey is not configured.");
if (jwtSigningKey == PlaceholderSigningKey || Encoding.UTF8.GetByteCount(jwtSigningKey) < 32)
{
    if (builder.Environment.IsDevelopment())
    {
        Console.Error.WriteLine(
            "WARNING: Jwt:SigningKey is the placeholder/default value — fine for local development, " +
            "but every token this instance issues is forgeable. Set a real generated secret (32+ bytes, " +
            "e.g. `dotnet user-secrets set Jwt:SigningKey <value> --project src/Corkboard.Api`) before " +
            "deploying anywhere else.");
    }
    else
    {
        throw new InvalidOperationException(
            "Jwt:SigningKey must be overridden with a generated secret at least 32 bytes long outside Development.");
    }
}

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwtSection["Issuer"],
            ValidAudience = jwtSection["Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSigningKey)),
        };
    });

builder.Services.AddAuthorization();

// Slows down brute-force/credential-stuffing against the credential-checking
// endpoints (login, client-credentials token, account creation) — a per-IP cap
// independent of, and in addition to, AuthController's own per-account lockout.
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.OnRejected = (context, cancellationToken) =>
    {
        context.HttpContext.Response.ContentType = "application/problem+json";
        return new ValueTask(context.HttpContext.Response.WriteAsJsonAsync(
            new ProblemDetails
            {
                Title = "Too many requests",
                Detail = "Too many attempts — please wait a moment and try again.",
                Status = StatusCodes.Status429TooManyRequests,
            },
            cancellationToken));
    };

    options.AddPolicy(RateLimiterPolicies.Auth, httpContext => RateLimitPartition.GetFixedWindowLimiter(
        partitionKey: httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            Window = TimeSpan.FromMinutes(1),
            PermitLimit = 10,
            QueueLimit = 0,
        }));
});

const string ClientCorsPolicy = "Client";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod().WithExposedHeaders("X-Total-Count", "Idempotent-Replayed"));
});

builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<INodeService, NodeService>();
builder.Services.AddScoped<ICollectionService, CollectionService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ICalendarService, CalendarService>();
builder.Services.AddScoped<IMealPlanService, MealPlanService>();
builder.Services.AddScoped<IRecipePhotoService, RecipePhotoService>();
builder.Services.AddScoped<IFamilyService, FamilyService>();
builder.Services.AddScoped<IFamilyMemberService, FamilyMemberService>();
builder.Services.AddScoped<IApiClientService, ApiClientService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<ApiCallLogCleanupJob>();
builder.Services.AddSingleton<ApiCallLogWriter>();
builder.Services.AddHostedService(sp => sp.GetRequiredService<ApiCallLogWriter>());

// Gzip/Brotli for JSON and the static bundle — the biggest win on a slow link to a low-powered host.
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(["application/problem+json", "image/svg+xml", "application/manifest+json"]);
});
builder.Services.Configure<BrotliCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);
builder.Services.Configure<GzipCompressionProviderOptions>(o => o.Level = System.IO.Compression.CompressionLevel.Fastest);

builder.Services.Configure<PushOptions>(builder.Configuration.GetSection(PushOptions.SectionName));
builder.Services.AddScoped<NotificationService>();
builder.Services.AddScoped<ReminderService>();
builder.Services.AddSingleton<IPushSender, WebPushSender>();
builder.Services.AddHostedService<ReminderWorker>();

builder.Services.AddSingleton<RecurrenceExpansionService>();
builder.Services.AddSingleton<IcsExportService>();
builder.Services.AddSingleton<IcsImportService>();

// TickerQ persists its jobs via EF Core into CorkboardDbContext (same Postgres
// database, no separate worker infra) — see CorkboardDbContext's class doc.
builder.Services.AddTickerQ(options =>
{
    options.AddOperationalStore(efOptions =>
    {
        efOptions.UseApplicationDbContext<CorkboardDbContext>(ConfigurationType.UseModelCustomizer);
    });

    if (builder.Environment.IsDevelopment())
    {
        options.AddDashboard();
    }
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CorkboardDbContext>();

    // Opt-in, off by default: applying migrations from every instance that
    // starts up is unsafe with more than one replica. The single-instance
    // Docker image sets this so self-hosters don't need a separate `dotnet
    // ef database update` step.
    if (builder.Configuration.GetValue<bool>("ApplyMigrationsOnStartup"))
    {
        await db.Database.MigrateAsync();
    }

    // Ensures the Angular GUI's own first-party ApiClient row exists — every
    // human login (TokenService.CreateTokenAsync) attaches its id as a
    // ClientId claim so the GUI's own traffic shows up in the API-clients
    // call log too. Idempotent; assumes migrations have already been applied
    // (this only queries/inserts, never migrates, unless the flag above did).
    if (!await db.ApiClients.AnyAsync(c => c.IsFirstParty))
    {
        db.ApiClients.Add(new ApiClient
        {
            Id = Guid.NewGuid(),
            Name = "Corkboard Web",
            ClientId = "corkboard-web",
            ClientSecretHash = string.Empty,
            Scopes = string.Empty,
            IsFirstParty = true,
            CreatedAt = DateTimeOffset.UtcNow,
            CreatedByUserId = Guid.Empty,
        });
        await db.SaveChangesAsync();
    }
}

// Configure the HTTP request pipeline.

// No custom IExceptionHandler registered, so this falls back to writing a
// ProblemDetails response (via AddProblemDetails() above) for any exception
// that reaches here — first in the pipeline so it covers everything downstream.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseResponseCompression();

// Serves the Angular build the Docker image copies into wwwroot (no-op if
// wwwroot is empty, e.g. local `dotnet run` where the client runs via `ng
// serve` instead). MapFallbackToFile below routes any unmatched GET request
// to index.html so Angular's client-side router handles it.
app.UseDefaultFiles();
var staticFileOptions = new StaticFileOptions
{
    // Angular's build fingerprints its bundles (main-XXXXXXXX.js, chunk-XXXXXXXX.js), so those never change under
    // the same name and can be cached for a year. Everything else (index.html, service worker, manifest, icons)
    // is revalidated with an ETag, which is a cheap 304.
    OnPrepareResponse = ctx =>
    {
        var hashed = System.Text.RegularExpressions.Regex.IsMatch(ctx.File.Name, @"^[\w.]+-[A-Za-z0-9_]{8}\.(js|css)$");
        ctx.Context.Response.Headers.CacheControl = hashed ? "public,max-age=31536000,immutable" : "no-cache";
    },
};
app.UseStaticFiles(staticFileOptions);

app.UseCors(ClientCorsPolicy);

app.UseRateLimiter();

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<ApiCallLoggingMiddleware>();
app.UseMiddleware<IdempotencyMiddleware>();

app.MapControllers();

app.UseTickerQ();

app.MapFallbackToFile("index.html", staticFileOptions);

app.Run();
