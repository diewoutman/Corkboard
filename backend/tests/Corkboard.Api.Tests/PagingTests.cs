using System.ComponentModel.DataAnnotations;
using Corkboard.Api.Common;
using Corkboard.Application.Common;

namespace Corkboard.Api.Tests;

public class PagingTests
{
    [Fact]
    public void Slices_a_list_and_keeps_the_total()
    {
        IReadOnlyList<int> all = Enumerable.Range(1, 120).ToList();

        var page3 = all.ToPage(new PageRequest(3, 50));

        Assert.Equal(120, page3.TotalCount);
        Assert.Equal(new[] { 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120 }, page3.Items);
        Assert.Empty(all.ToPage(new PageRequest(4, 50)).Items);
    }

    [Fact]
    public void A_page_size_is_never_larger_than_fifty()
    {
        Assert.Equal(50, new PageRequest(1, 500).Take);
        Assert.Equal(50, PageRequest.Default.Take);
    }

    [Theory]
    [InlineData(1, 50, true)]
    [InlineData(1, 51, false)]
    [InlineData(0, 10, false)]
    [InlineData(2, 0, false)]
    public void The_query_binder_rejects_out_of_range_values(int page, int pageSize, bool valid)
    {
        var query = new PageQuery { Page = page, PageSize = pageSize };

        Assert.Equal(valid, Validator.TryValidateObject(query, new ValidationContext(query), null, validateAllProperties: true));
    }
}
