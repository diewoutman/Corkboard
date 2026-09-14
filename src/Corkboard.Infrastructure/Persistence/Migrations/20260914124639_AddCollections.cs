using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCollections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "CollectionId",
                table: "Nodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Collections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FamilyId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Type = table.Column<int>(type: "integer", nullable: false),
                    ParentCollectionId = table.Column<Guid>(type: "uuid", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Collections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Collections_Collections_ParentCollectionId",
                        column: x => x.ParentCollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_Collections_Families_FamilyId",
                        column: x => x.FamilyId,
                        principalTable: "Families",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Nodes_CollectionId",
                table: "Nodes",
                column: "CollectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_FamilyId_Type",
                table: "Collections",
                columns: new[] { "FamilyId", "Type" });

            migrationBuilder.CreateIndex(
                name: "IX_Collections_ParentCollectionId",
                table: "Collections",
                column: "ParentCollectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Nodes_Collections_CollectionId",
                table: "Nodes",
                column: "CollectionId",
                principalTable: "Collections",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Nodes_Collections_CollectionId",
                table: "Nodes");

            migrationBuilder.DropTable(
                name: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Nodes_CollectionId",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "CollectionId",
                table: "Nodes");
        }
    }
}
