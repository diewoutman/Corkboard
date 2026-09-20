using System.Security.Claims;
using System.Text;
using Corkboard.Api.Common;
using Microsoft.AspNetCore.Http;

namespace Corkboard.Api.Tests;

public class IdempotencyMiddlewareTests
{
    private static DefaultHttpContext Post(string? key, Guid userId, string path = "/api/nodes")
    {
        var context = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(new ClaimsIdentity([new Claim(ClaimTypes.NameIdentifier, userId.ToString())], "Test")),
        };
        context.Request.Method = "POST";
        context.Request.Path = path;
        if (key is not null) context.Request.Headers[IdempotencyMiddleware.HeaderName] = key;
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static string Body(HttpContext context)
    {
        context.Response.Body.Position = 0;
        return new StreamReader(context.Response.Body).ReadToEnd();
    }

    private sealed class Counter(int status = 201)
    {
        public int Calls;

        public async Task Handle(HttpContext context)
        {
            var n = Interlocked.Increment(ref Calls);
            context.Response.StatusCode = status;
            await Task.Delay(20);
            await context.Response.Body.WriteAsync(Encoding.UTF8.GetBytes($"created-{n}"));
        }
    }

    [Fact]
    public async Task RepeatedKey_RunsTheHandlerOnce_AndReplaysTheFirstResponse()
    {
        var counter = new Counter();
        var middleware = new IdempotencyMiddleware(counter.Handle);
        var user = Guid.NewGuid();
        var key = Guid.NewGuid().ToString();

        var first = Post(key, user);
        var second = Post(key, user);
        await middleware.InvokeAsync(first);
        await middleware.InvokeAsync(second);

        Assert.Equal(1, counter.Calls);
        Assert.Equal("created-1", Body(first));
        Assert.Equal("created-1", Body(second));
        Assert.Equal(201, second.Response.StatusCode);
        Assert.Equal("true", second.Response.Headers["Idempotent-Replayed"].ToString());
    }

    [Fact]
    public async Task ConcurrentDuplicates_RunTheHandlerOnce()
    {
        var counter = new Counter();
        var middleware = new IdempotencyMiddleware(counter.Handle);
        var user = Guid.NewGuid();
        var key = Guid.NewGuid().ToString();

        var contexts = Enumerable.Range(0, 5).Select(_ => Post(key, user)).ToList();
        await Task.WhenAll(contexts.Select(middleware.InvokeAsync));

        Assert.Equal(1, counter.Calls);
        Assert.All(contexts, c => Assert.Equal("created-1", Body(c)));
    }

    [Fact]
    public async Task DifferentKeysOrUsers_AreIndependent()
    {
        var counter = new Counter();
        var middleware = new IdempotencyMiddleware(counter.Handle);
        var key = Guid.NewGuid().ToString();

        await middleware.InvokeAsync(Post(key, Guid.NewGuid()));
        await middleware.InvokeAsync(Post(key, Guid.NewGuid()));
        await middleware.InvokeAsync(Post(Guid.NewGuid().ToString(), Guid.NewGuid()));

        Assert.Equal(3, counter.Calls);
    }

    [Fact]
    public async Task NoKey_IsNeverDeduplicated()
    {
        var counter = new Counter();
        var middleware = new IdempotencyMiddleware(counter.Handle);
        var user = Guid.NewGuid();

        await middleware.InvokeAsync(Post(null, user));
        await middleware.InvokeAsync(Post(null, user));

        Assert.Equal(2, counter.Calls);
    }

    [Fact]
    public async Task FailedResponse_IsNotRemembered_SoARetryRunsAgain()
    {
        var counter = new Counter(status: 400);
        var middleware = new IdempotencyMiddleware(counter.Handle);
        var user = Guid.NewGuid();
        var key = Guid.NewGuid().ToString();

        await middleware.InvokeAsync(Post(key, user));
        await middleware.InvokeAsync(Post(key, user));

        Assert.Equal(2, counter.Calls);
    }
}
