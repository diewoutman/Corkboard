import { CreateFab } from '../../core/create-fab';
import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
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
export class FamilyPage implements OnInit, OnDestroy {
  private readonly createFab = inject(CreateFab);
  private unregisterFab?: () => void;
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  /** Blocks a second submit (double click, Enter twice) while a create/save request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
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
    private readonly transloco: TranslocoService,
  ) {}

  /** Makes the app's "+" button open this page's editor. */
  private registerFab() {
    this.unregisterFab?.();
    this.unregisterFab = this.createFab.register({
      kind: null,
      open: () => {
        this.openNewMemberForm();
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy() {
    this.unregisterFab?.();
  }

  ngOnInit() {
    this.registerFab();
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
        this.errorMessage = this.transloco.translate('family.errors.load');
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

    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.members = this.editingMemberId ? this.members.map((m) => (m.id === saved.id ? saved : m)) : [...this.members, saved];
        this.showMemberForm = false;
        this.editingMemberId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('family.errors.save'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteMember(member: FamilyMemberResponse) {
    this.removing.run(this.familyMembersApi.delete(member.id), member.id).subscribe({
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

  openAccountForm(member: FamilyMemberResponse) {
    this.accountFormForId = member.id;
    this.accountForm = this.emptyAccountForm();
  }

  cancelAccountForm() {
    this.accountFormForId = null;
  }

  submitAccountForm() {
    if (!this.accountFormForId || !this.accountForm.email || !this.accountForm.password) return;

    this.submit.run(this.familyMembersApi.createAccount(this.accountFormForId, this.accountForm)).subscribe({
      next: (saved) => {
        this.members = this.members.map((m) => (m.id === saved.id ? saved : m));
        this.accountFormForId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('family.errors.login'));
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
