using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddApiClientIsFirstParty : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsFirstParty",
                table: "ApiClients",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsFirstParty",
                table: "ApiClients");
        }
    }
}
