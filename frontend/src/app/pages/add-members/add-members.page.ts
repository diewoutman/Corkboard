import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { Router } from '@angular/router';
import { FamilyMembers } from '../../core/family-members';
import { FamilyMemberResponse } from '../../core/models';

@Component({
  selector: 'app-add-members',
  templateUrl: './add-members.page.html',
  styleUrls: ['./add-members.page.scss'],
  standalone: false,
})
export class AddMembersPage implements OnInit {
  members: FamilyMemberResponse[] = [];
  displayName = '';
  color = '#4c6ef5';
  errorMessage: string | null = null;
  loading = true;
  submitting = false;

  constructor(
    private readonly familyMembers: FamilyMembers,
    private readonly router: Router,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.familyMembers.list().subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('members.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  addMember() {
    if (!this.displayName) return;

    this.submitting = true;
    this.errorMessage = null;

    this.familyMembers
      .create({
        displayName: this.displayName,
        color: this.color,
        avatarUrl: null,
        linkedUserId: null,
        dateOfBirth: null,
      })
      .subscribe({
        next: (member) => {
          this.members = [...this.members, member];
          this.displayName = '';
          this.submitting = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = this.transloco.translate('members.errors.add');
          this.submitting = false;
          this.cdr.markForCheck();
        },
      });
  }

  removeMember(member: FamilyMemberResponse) {
    this.familyMembers.delete(member.id).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== member.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('members.errors.remove');
        this.cdr.markForCheck();
      },
    });
  }

  finish() {
    this.router.navigateByUrl('/home');
  }
}
