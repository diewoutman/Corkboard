import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Auth } from '../../core/auth';
import { FamilyMembers } from '../../core/family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, FamilyRole } from '../../core/models';

@Component({
  selector: 'app-family',
  templateUrl: './family.page.html',
  styleUrls: ['./family.page.scss'],
  standalone: false,
})
export class FamilyPage implements OnInit {
  readonly isOwner = this.auth.isOwner;

  members: FamilyMemberResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showMemberForm = false;
  editingMemberId: string | null = null;
  memberForm = this.emptyMemberForm();

  accountFormForId: string | null = null;
  accountForm = this.emptyAccountForm();

  constructor(
    private readonly auth: Auth,
    private readonly familyMembersApi: FamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    this.familyMembersApi.list().subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your family members. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openNewMemberForm() {
    this.editingMemberId = null;
    this.memberForm = this.emptyMemberForm();
    this.showMemberForm = true;
  }

  openEditMemberForm(member: FamilyMemberResponse) {
    this.editingMemberId = member.id;
    this.memberForm = {
      displayName: member.displayName,
      color: member.color,
      dateOfBirth: member.dateOfBirth ?? '',
    };
    this.showMemberForm = true;
  }

  cancelMemberForm() {
    this.showMemberForm = false;
    this.editingMemberId = null;
  }

  submitMemberForm() {
    if (!this.memberForm.displayName) return;

    const existing = this.editingMemberId ? this.members.find((m) => m.id === this.editingMemberId) : null;
    const request = {
      displayName: this.memberForm.displayName,
      color: this.memberForm.color,
      avatarUrl: existing?.avatarUrl ?? null,
      linkedUserId: existing?.linkedUserId ?? null,
      dateOfBirth: this.memberForm.dateOfBirth || null,
    };

    const request$ = this.editingMemberId
      ? this.familyMembersApi.update(this.editingMemberId, request)
      : this.familyMembersApi.create(request);

    request$.subscribe({
      next: (saved) => {
        this.members = this.editingMemberId ? this.members.map((m) => (m.id === saved.id ? saved : m)) : [...this.members, saved];
        this.showMemberForm = false;
        this.editingMemberId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not save that family member.');
        this.cdr.markForCheck();
      },
    });
  }

  deleteMember(member: FamilyMemberResponse) {
    this.familyMembersApi.delete(member.id).subscribe({
      next: () => {
        this.members = this.members.filter((m) => m.id !== member.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not remove that family member.';
        this.cdr.markForCheck();
      },
    });
  }

  openAccountForm(member: FamilyMemberResponse) {
    this.accountFormForId = member.id;
    this.accountForm = this.emptyAccountForm();
  }

  cancelAccountForm() {
    this.accountFormForId = null;
  }

  submitAccountForm() {
    if (!this.accountFormForId || !this.accountForm.email || !this.accountForm.password) return;

    this.familyMembersApi.createAccount(this.accountFormForId, this.accountForm).subscribe({
      next: (saved) => {
        this.members = this.members.map((m) => (m.id === saved.id ? saved : m));
        this.accountFormForId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not create that login.');
        this.cdr.markForCheck();
      },
    });
  }

  private emptyMemberForm() {
    return { displayName: '', color: '#4c6ef5', dateOfBirth: '' };
  }

  private emptyAccountForm(): { email: string; password: string; role: FamilyRole } {
    return { email: '', password: '', role: 'Adult' };
  }
}
