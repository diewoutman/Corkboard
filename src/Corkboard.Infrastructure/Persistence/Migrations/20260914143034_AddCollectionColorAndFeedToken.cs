using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollectionColorAndFeedToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Color",
                table: "Collections",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FeedToken",
                table: "Collections",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Collections_FeedToken",
                table: "Collections",
                column: "FeedToken",
                unique: true,
                filter: "\"FeedToken\" IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Collections_FeedToken",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Color",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "FeedToken",
                table: "Collections");
        }
    }
}
