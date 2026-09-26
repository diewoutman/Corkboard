using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRecipesAndMealPlanner : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "NormalizedName",
                table: "Nodes",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PlannedServings",
                table: "Nodes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "Nodes",
                type: "numeric",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "RecipeId",
                table: "Nodes",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Servings",
                table: "Nodes",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Unit",
                table: "Nodes",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "RecipeIngredients",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    NormalizedName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Quantity = table.Column<decimal>(type: "numeric", nullable: true),
                    Unit = table.Column<int>(type: "integer", nullable: true),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecipeIngredients", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecipeIngredients_Nodes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "Nodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "RecipeSteps",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    RecipeId = table.Column<Guid>(type: "uuid", nullable: false),
                    Instruction = table.Column<string>(type: "text", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RecipeSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_RecipeSteps_Nodes_RecipeId",
                        column: x => x.RecipeId,
                        principalTable: "Nodes",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Nodes_RecipeId",
                table: "Nodes",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_MealPlan",
                table: "Collections",
                column: "FamilyId",
                unique: true,
                filter: "\"Type\" = 5");

            migrationBuilder.CreateIndex(
                name: "IX_Collections_SystemShoppingList",
                table: "Collections",
                column: "FamilyId",
                unique: true,
                filter: "\"IsSystemManaged\" AND \"Type\" = 0");

            migrationBuilder.CreateIndex(
                name: "IX_RecipeIngredients_RecipeId",
                table: "RecipeIngredients",
                column: "RecipeId");

            migrationBuilder.CreateIndex(
                name: "IX_RecipeSteps_RecipeId",
                table: "RecipeSteps",
                column: "RecipeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Nodes_Nodes_RecipeId",
                table: "Nodes",
                column: "RecipeId",
                principalTable: "Nodes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Nodes_Nodes_RecipeId",
                table: "Nodes");

            migrationBuilder.DropTable(
                name: "RecipeIngredients");

            migrationBuilder.DropTable(
                name: "RecipeSteps");

            migrationBuilder.DropIndex(
                name: "IX_Nodes_RecipeId",
                table: "Nodes");

            migrationBuilder.DropIndex(
                name: "IX_Collections_MealPlan",
                table: "Collections");

            migrationBuilder.DropIndex(
                name: "IX_Collections_SystemShoppingList",
                table: "Collections");

            migrationBuilder.DropColumn(
                name: "NormalizedName",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "PlannedServings",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "RecipeId",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "Servings",
                table: "Nodes");

            migrationBuilder.DropColumn(
                name: "Unit",
                table: "Nodes");
        }
    }
}
