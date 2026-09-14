using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ExtractCollectionAddressAndRelaxContact : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CollectionAddresses",
                columns: table => new
                {
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Street = table.Column<string>(type: "text", nullable: true),
                    City = table.Column<string>(type: "text", nullable: true),
                    PostalCode = table.Column<string>(type: "text", nullable: true),
                    Country = table.Column<string>(type: "text", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CollectionAddresses", x => x.CollectionId);
                    table.ForeignKey(
                        name: "FK_CollectionAddresses_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // Preserve any existing Collection addresses (e.g. Households already
            // set up) before the source columns are dropped below.
            migrationBuilder.Sql("""
                INSERT INTO "CollectionAddresses" ("CollectionId", "Street", "City", "PostalCode", "Country")
                SELECT "Id", "Street", "City", "PostalCode", "Country"
                FROM "Collections"
                WHERE "Street" IS NOT NULL OR "City" IS NOT NULL OR "PostalCode" IS NOT NULL OR "Country" IS NOT NULL;
                """);

            migrationBuilder.DropColumn(
                name: "City",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Country",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "PostalCode",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Street",
                table: "Collections");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CollectionAddresses");

            migrationBuilder.AddColumn<string>(
                name: "City",
                table: "Collections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Country",
                table: "Collections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PostalCode",
                table: "Collections",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Street",
                table: "Collections",
                type: "text",
                nullable: true);
        }
    }
}
