import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Admin } from '../../core/admin';
import { AdminFamilyMembers } from '../../core/admin-family-members';
import { extractErrorMessage } from '../../core/http-error';
import { FamilyMemberResponse, FamilyResponse, FamilyRole } from '../../core/models';

@Component({
  selector: 'app-admin-family-detail',
  templateUrl: './admin-family-detail.page.html',
  standalone: false,
})
export class AdminFamilyDetailPage implements OnInit {
  /** Blocks a second submit (double click, Enter twice) while a create/save request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
  familyId = '';
  family: FamilyResponse | null = null;
  familyForm = { name: '', timeZone: '' };

  members: FamilyMemberResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showMemberForm = false;
  editingMemberId: string | null = null;
  memberForm = this.emptyMemberForm();

  accountFormForId: string | null = null;
  accountForm = this.emptyAccountForm();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly adminApi: Admin,
    private readonly adminFamilyMembersApi: AdminFamilyMembers,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.familyId = this.route.snapshot.paramMap.get('id')!;
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;

    this.adminApi.getFamily(this.familyId).subscribe({
      next: (family) => {
        this.family = family;
        this.familyForm = { name: family.name, timeZone: family.timeZone };
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load this family.';
        this.cdr.markForCheck();
      },
    });

    this.adminFamilyMembersApi.list(this.familyId).subscribe({
      next: (members) => {
        this.members = members;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load this family\'s members.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitFamilyForm() {
    if (!this.familyForm.name || !this.familyForm.timeZone) return;

    this.submit.run(this.adminApi.updateFamily(this.familyId, this.familyForm)).subscribe({
      next: (family) => {
        this.family = family;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not save this family.');
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
      ? this.adminFamilyMembersApi.update(this.familyId, this.editingMemberId, request)
      : this.adminFamilyMembersApi.create(this.familyId, request);

    this.submit.run(request$).subscribe({
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
    this.adminFamilyMembersApi.delete(this.familyId, member.id).subscribe({
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

    this.submit.run(this.adminFamilyMembersApi.createAccount(this.familyId, this.accountFormForId, this.accountForm)).subscribe({
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
