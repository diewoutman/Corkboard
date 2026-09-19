using System.ComponentModel.DataAnnotations;
using System.Reflection;
using Corkboard.Contracts.ApiClients;
using Corkboard.Contracts.Auth;
using Corkboard.Contracts.FamilyMembers;

namespace Corkboard.Api.Tests;

/// <summary>
/// [ApiController] runs these DataAnnotations automatically on every incoming
/// request via ModelState, before an action body ever executes. For a record
/// with a primary constructor, ASP.NET Core validates the *constructor
/// parameter*'s attributes, not the compiler-generated property's — putting
/// them on the property instead is a startup-time error (ModelMetadata.
/// ThrowIfRecordTypeHasValidationOnProperties), which is why the Contracts
/// files declare them as plain `[Required, ...] string Foo` parameters rather
/// than `[property: Required, ...]`. System.ComponentModel.DataAnnotations.
/// Validator.TryValidateObject only walks properties, so it can't see these —
/// this replicates ASP.NET Core's own parameter-based validation instead.
/// </summary>
public class ContractValidationTests
{
    private static IReadOnlyList<ValidationResult> Validate(object request)
    {
        var results = new List<ValidationResult>();
        var type = request.GetType();

        foreach (var parameter in type.GetConstructors().Single().GetParameters())
        {
            var value = type.GetProperty(parameter.Name!)!.GetValue(request);
            foreach (var attribute in parameter.GetCustomAttributes(typeof(ValidationAttribute), inherit: true).Cast<ValidationAttribute>())
            {
                if (!attribute.IsValid(value))
                {
                    results.Add(new ValidationResult(attribute.FormatErrorMessage(parameter.Name!), [parameter.Name!]));
                }
            }
        }

        return results;
    }

    [Theory]
    [InlineData("not-an-email")]
    [InlineData("")]
    [InlineData(null)]
    public void RegisterRequest_rejects_an_invalid_email(string? email)
    {
        var errors = Validate(new RegisterRequest(email!, "password1"));

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void RegisterRequest_rejects_a_password_below_the_minimum_length()
    {
        var errors = Validate(new RegisterRequest("owner@example.com", "abc"));

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void RegisterRequest_rejects_an_absurdly_long_password()
    {
        // Guards against a password-hashing-DoS payload (see AuthContracts.cs).
        var errors = Validate(new RegisterRequest("owner@example.com", new string('a', 10_000)));

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void RegisterRequest_accepts_a_valid_payload()
    {
        var errors = Validate(new RegisterRequest("owner@example.com", "password1"));

        Assert.Empty(errors);
    }

    [Fact]
    public void CreateFamilyMemberAccountRequest_rejects_a_short_password()
    {
        var errors = Validate(new CreateFamilyMemberAccountRequest("member@example.com", "12345", FamilyRole.Member));

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void CreateApiClientRequest_rejects_a_blank_name()
    {
        var errors = Validate(new CreateApiClientRequest("", [ApiScopes.Read(ApiScopes.Nodes)]));

        Assert.NotEmpty(errors);
    }

    [Fact]
    public void ApiClientTokenRequest_rejects_an_empty_client_secret()
    {
        var errors = Validate(new ApiClientTokenRequest("some-client-id", ""));

        Assert.NotEmpty(errors);
    }
}
