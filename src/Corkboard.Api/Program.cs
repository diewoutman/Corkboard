using System.Text;
using System.Text.Json.Serialization;
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
using Corkboard.Application.Nodes;
using Corkboard.Domain.Entities;
using Corkboard.Infrastructure.Ics;
using Corkboard.Infrastructure.Identity;
using Corkboard.Infrastructure.Persistence;
using Corkboard.Infrastructure.Recurrence;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
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
    })
    .AddRoles<IdentityRole<Guid>>()
    .AddEntityFrameworkStores<CorkboardDbContext>()
    .AddDefaultTokenProviders();

var jwtSection = builder.Configuration.GetSection("Jwt");
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
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtSection["SigningKey"]
                    ?? throw new InvalidOperationException("Jwt:SigningKey is not configured."))),
        };
    });

builder.Services.AddAuthorization();

const string ClientCorsPolicy = "Client";
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy(ClientCorsPolicy, policy =>
        policy.WithOrigins(allowedOrigins).AllowAnyHeader().AllowAnyMethod());
});

builder.Services.Configure<JwtOptions>(jwtSection);
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<INodeService, NodeService>();
builder.Services.AddScoped<ICollectionService, CollectionService>();
builder.Services.AddScoped<IDashboardService, DashboardService>();
builder.Services.AddScoped<ICalendarService, CalendarService>();
builder.Services.AddScoped<IFamilyService, FamilyService>();
builder.Services.AddScoped<IFamilyMemberService, FamilyMemberService>();
builder.Services.AddScoped<IApiClientService, ApiClientService>();
builder.Services.AddScoped<IAdminService, AdminService>();
builder.Services.AddScoped<ApiCallLogCleanupJob>();

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

// Ensures the Angular GUI's own first-party ApiClient row exists — every human
// login (TokenService.CreateTokenAsync) attaches its id as a ClientId claim so
// the GUI's own traffic shows up in the API-clients call log too. Idempotent;
// assumes migrations have already been applied (this only queries/inserts,
// never migrates).
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CorkboardDbContext>();
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

app.UseCors(ClientCorsPolicy);

app.UseAuthentication();
app.UseAuthorization();

app.UseMiddleware<ApiCallLoggingMiddleware>();

app.MapControllers();

app.UseTickerQ();

app.Run();
