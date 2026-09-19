using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddScopesSectionsAndInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SectionId",
                table: "Nodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsInbox",
                table: "Collections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsSystemManaged",
                table: "Collections",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "OwnerUserId",
                table: "Collections",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "Collections",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Sections",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CollectionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Sections", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Sections_Collections_CollectionId",
                        column: x => x.CollectionId,
                        principalTable: "Collections",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Nodes_SectionId",
                table: "Nodes",
                column: "SectionId");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_FamilyId_Scope_OwnerUserId",
                table: "Collections",
                columns: new[] { "FamilyId", "Scope", "OwnerUserId" });

            migrationBuilder.CreateIndex(
                name: "IX_Collections_FamilyInbox",
                table: "Collections",
                column: "FamilyId",
                unique: true,
                filter: "\"IsInbox\" AND \"Scope\" = 0");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_PersonalInbox",
                table: "Collections",
                columns: new[] { "FamilyId", "OwnerUserId" },
                unique: true,
                filter: "\"IsInbox\" AND \"Scope\" = 1");

            migrationBuilder.CreateIndex(
                name: "IX_Sections_CollectionId",
                table: "Sections",
                column: "CollectionId");

            migrationBuilder.AddForeignKey(
                name: "FK_Nodes_Sections_SectionId",
                table: "Nodes",
                column: "SectionId",
                principalTable: "Sections",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            // Every unique Category of a list becomes a Section of that list (matched
            // case-insensitively, like the API does), and its tasks point at it. All
            // existing lists keep Scope = Family (the column default), so nothing is lost.
            migrationBuilder.Sql(@"
                INSERT INTO ""Sections"" (""Id"", ""CollectionId"", ""Name"", ""SortOrder"")
                SELECT gen_random_uuid(), c.""CollectionId"", c.""Name"",
                       (ROW_NUMBER() OVER (PARTITION BY c.""CollectionId"" ORDER BY c.""Name"")) - 1
                FROM (
                    SELECT ""CollectionId"", MIN(""Category"") AS ""Name""
                    FROM ""Nodes""
                    WHERE ""NodeType"" = 'Task' AND ""Category"" IS NOT NULL AND ""CollectionId"" IS NOT NULL
                    GROUP BY ""CollectionId"", LOWER(""Category"")
                ) c;");

            migrationBuilder.Sql(@"
                UPDATE ""Nodes"" n SET ""SectionId"" = s.""Id""
                FROM ""Sections"" s
                WHERE n.""NodeType"" = 'Task' AND n.""CollectionId"" = s.""CollectionId""
                  AND LOWER(n.""Category"") = LOWER(s.""Name"");");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "Nodes");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Nodes",
                type: "text",
                nullable: true);

            migrationBuilder.Sql(@"
                UPDATE ""Nodes"" n SET ""Category"" = s.""Name""
                FROM ""Sections"" s WHERE n.""SectionId"" = s.""Id"";");

            migrationBuilder.DropForeignKey(
                name: "FK_Nodes_Sections_SectionId",
                table: "Nodes");

            migrationBuilder.DropTable(
                name: "Sections");

            migrationBuilder.DropIndex(
                name: "IX_Nodes_SectionId",
                table: "Nodes");

            migrationBuilder.DropIndex(
                name: "IX_Collections_FamilyId_Scope_OwnerUserId",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_FamilyInbox",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_PersonalInbox",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "SectionId",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "IsInbox",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "IsSystemManaged",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "OwnerUserId",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "Collections");

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "Nodes",
                type: "text",
                nullable: true);
        }
    }
}
