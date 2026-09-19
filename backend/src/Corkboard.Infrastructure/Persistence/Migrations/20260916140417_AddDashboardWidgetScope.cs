using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDashboardWidgetScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DashboardWidgets_FamilyId",
                table: "DashboardWidgets");

            migrationBuilder.DropIndex(
                name: "IX_DashboardWidgets_UserId_FamilyId_SortOrder",
                table: "DashboardWidgets");

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "DashboardWidgets",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgets_FamilyId_Scope_SortOrder",
                table: "DashboardWidgets",
                columns: new[] { "FamilyId", "Scope", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgets_UserId_FamilyId_Scope_SortOrder",
                table: "DashboardWidgets",
                columns: new[] { "UserId", "FamilyId", "Scope", "SortOrder" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DashboardWidgets_FamilyId_Scope_SortOrder",
                table: "DashboardWidgets");

            migrationBuilder.DropIndex(
                name: "IX_DashboardWidgets_UserId_FamilyId_Scope_SortOrder",
                table: "DashboardWidgets");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "DashboardWidgets");

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgets_FamilyId",
                table: "DashboardWidgets",
                column: "FamilyId");

            migrationBuilder.CreateIndex(
                name: "IX_DashboardWidgets_UserId_FamilyId_SortOrder",
                table: "DashboardWidgets",
                columns: new[] { "UserId", "FamilyId", "SortOrder" });
        }
    }
}
