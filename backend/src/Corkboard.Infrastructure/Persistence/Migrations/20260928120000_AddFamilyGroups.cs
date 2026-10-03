using Corkboard.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Corkboard.Infrastructure.Persistence.Migrations;

[DbContext(typeof(CorkboardDbContext))]
[Migration("20260928120000_AddFamilyGroups")]
public partial class AddFamilyGroups : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable("FamilyGroups", table => new
        {
            Id = table.Column<Guid>(type: "uuid", nullable: false),
            FamilyId = table.Column<Guid>(type: "uuid", nullable: false),
            Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
            Color = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
            CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
        }, constraints: table => { table.PrimaryKey("PK_FamilyGroups", x => x.Id); table.ForeignKey("FK_FamilyGroups_Families_FamilyId", x => x.FamilyId, "Families", "Id", onDelete: ReferentialAction.Cascade); });
        migrationBuilder.CreateTable("FamilyGroupMemberships", table => new
        {
            FamilyGroupId = table.Column<Guid>(type: "uuid", nullable: false),
            FamilyMemberId = table.Column<Guid>(type: "uuid", nullable: false)
        }, constraints: table => { table.PrimaryKey("PK_FamilyGroupMemberships", x => new { x.FamilyGroupId, x.FamilyMemberId }); table.ForeignKey("FK_FamilyGroupMemberships_FamilyGroups_FamilyGroupId", x => x.FamilyGroupId, "FamilyGroups", "Id", onDelete: ReferentialAction.Cascade); table.ForeignKey("FK_FamilyGroupMemberships_FamilyMembers_FamilyMemberId", x => x.FamilyMemberId, "FamilyMembers", "Id", onDelete: ReferentialAction.Cascade); });
        migrationBuilder.CreateIndex("IX_FamilyGroups_FamilyId_Name", "FamilyGroups", new[] { "FamilyId", "Name" }, unique: true);
        migrationBuilder.CreateIndex("IX_FamilyGroupMemberships_FamilyMemberId", "FamilyGroupMemberships", "FamilyMemberId");
    }

    protected override void Down(MigrationBuilder migrationBuilder) { migrationBuilder.DropTable("FamilyGroupMemberships"); migrationBuilder.DropTable("FamilyGroups"); }
}
