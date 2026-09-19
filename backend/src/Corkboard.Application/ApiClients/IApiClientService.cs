using Corkboard.Application.Common;
using Corkboard.Contracts.ApiClients;
using Corkboard.Domain.Entities;

namespace Corkboard.Application.ApiClients;

public interface IApiClientService
{
    Task<IReadOnlyList<ApiClientResponse>> ListAsync(CancellationToken cancellationToken);

    /// <summary>Only call returning the plaintext secret — display-once, never retrievable again.</summary>
    Task<Result<CreatedApiClientResponse>> CreateAsync(Guid createdByUserId, CreateApiClientRequest request, CancellationToken cancellationToken);

    Task<Result> RevokeAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Last 48h of calls for one client, newest first.</summary>
    Task<Result<IReadOnlyList<ApiCallLogEntryResponse>>> GetCallLogAsync(Guid id, CancellationToken cancellationToken);

    /// <summary>Client-credentials validation for the token endpoint. Null on a bad id/secret or a revoked client.</summary>
    Task<ApiClient?> ValidateCredentialsAsync(string clientId, string clientSecret, CancellationToken cancellationToken);
}
