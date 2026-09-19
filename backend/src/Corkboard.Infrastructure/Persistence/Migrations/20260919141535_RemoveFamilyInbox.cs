using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveFamilyInbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Collections_FamilyInbox",
                table: "Collections");

            // The Family Inbox becomes an ordinary (deletable, renamable) Family list, so its tasks are kept.
            migrationBuilder.Sql("UPDATE \"Collections\" SET \"IsInbox\" = FALSE WHERE \"IsInbox\" AND \"Scope\" = 0;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Collections_FamilyInbox",
                table: "Collections",
                column: "FamilyId",
                unique: true,
                filter: "\"IsInbox\" AND \"Scope\" = 0");
        }
    }
}
