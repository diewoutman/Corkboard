namespace Corkboard.Application.Common;

/// <summary>Outcome of a service call that has no value to return on success (e.g. Delete).</summary>
public readonly struct Result
{
    public bool IsSuccess { get; }
    public Error? Error { get; }

    private Result(bool isSuccess, Error? error)
    {
        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, null);

    public static Result Failure(Error error) => new(false, error);
}

/// <summary>
/// Outcome of a service call that returns <typeparamref name="T"/> on success, or an
/// <see cref="Common.Error"/> describing an expected business-rule failure (not-found,
/// invalid input, …) on failure. Lets services report those without throwing — see
/// ResultExtensions.ToActionResult in Corkboard.Api for the HTTP-layer mapping.
/// </summary>
public readonly struct Result<T>
{
    public bool IsSuccess { get; }
    public T Value { get; }
    public Error? Error { get; }

    private Result(bool isSuccess, T value, Error? error)
    {
        IsSuccess = isSuccess;
        Value = value;
        Error = error;
    }

    public static Result<T> Success(T value) => new(true, value, null);

    public static Result<T> Failure(Error error) => new(false, default!, error);

    /// <summary>
    /// Reshapes a successful value (e.g. an internal EF projection into its public
    /// response DTO) while passing an existing failure through unchanged.
    /// </summary>
    public Result<TOut> Map<TOut>(Func<T, TOut> selector) =>
        IsSuccess ? Result<TOut>.Success(selector(Value)) : Result<TOut>.Failure(Error!);
}
