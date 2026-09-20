import { SubmitGuard } from '../../core/submit-guard';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { forkJoin } from 'rxjs';
import { Collections } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, NodeResponse } from '../../core/models';
import { NULL_NOTE_FIELDS, Nodes } from '../../core/nodes';
import { PALETTE } from '../../core/colors';
import { PagedList } from '../../core/paging';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
  standalone: false,
})
export class ContactsPage implements OnInit {
  /** Ignores a repeated click on delete while that item's request is still in flight. */
  readonly removing = new SubmitGuard(inject(ChangeDetectorRef));
  /** Blocks a second submit (double click, Enter twice) while a create/save request is in flight. */
  readonly submit = new SubmitGuard(inject(ChangeDetectorRef));
  households: CollectionResponse[] = [];
  readonly contactList = new PagedList<NodeResponse>((page) => this.nodesApi.listPage({ type: 'Contact', sort: 'name', page }));
  selectedContactId: string | null = null;
  /** The contact just saved, which may sit on a page that isn't loaded yet. */
  private savedContact: NodeResponse | null = null;

  loading = true;
  errorMessage: string | null = null;

  showHouseholdsPanel = false;

  showHouseholdForm = false;
  editingHouseholdId: string | null = null;
  householdForm = this.emptyHouseholdForm();

  showContactForm = false;
  editingContactId: string | null = null;
  contactForm = this.emptyContactForm();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
    private readonly transloco: TranslocoService,
  ) {}

  ngOnInit() {
    this.reload();
  }

  get contacts(): NodeResponse[] {
    return this.contactList.items;
  }

  reload(quiet = false) {
    this.loading = !quiet;
    this.errorMessage = null;
    forkJoin({
      households: this.collectionsApi.list({ type: 'Household' }),
      contacts: this.contactList.first(),
    }).subscribe({
      next: ({ households }) => {
        this.households = households.sort((a, b) => a.name.localeCompare(b.name));
        if (!this.selectedContact) {
          this.selectedContactId = this.contacts[0]?.id ?? null;
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = this.transloco.translate('contacts.errors.load');
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  get selectedContact(): NodeResponse | null {
    return this.contacts.find((c) => c.id === this.selectedContactId) ?? (this.savedContact?.id === this.selectedContactId ? this.savedContact : null);
  }

  selectContact(contact: NodeResponse) {
    this.selectedContactId = contact.id;
    this.cancelContactForm();
  }

  householdName(id: string | null): string | null {
    if (!id) return null;
    return this.households.find((h) => h.id === id)?.name ?? null;
  }

  contactColor(contact: NodeResponse): string {
    const index = this.contacts.findIndex((c) => c.id === contact.id);
    return PALETTE[Math.max(index, 0) % PALETTE.length];
  }

  /** A Contact's own address if set, else its Household's — see CONCEPT.md on Household. */
  effectiveAddress(contact: NodeResponse): string | null {
    const own = this.formatAddress(contact.street, contact.city, contact.postalCode, contact.country);
    if (own) return own;

    const household = this.households.find((h) => h.id === contact.collectionId);
    return household ? this.formatAddress(household.street, household.city, household.postalCode, household.country) : null;
  }

  isOwnAddress(contact: NodeResponse): boolean {
    return this.formatAddress(contact.street, contact.city, contact.postalCode, contact.country) !== null;
  }

  private formatAddress(street: string | null, city: string | null, postalCode: string | null, country: string | null): string | null {
    const parts = [street, [postalCode, city].filter(Boolean).join(' '), country].filter((p) => !!p);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  addPhoneRow() {
    this.contactForm.phoneNumbers = [...this.contactForm.phoneNumbers, { number: '', label: '' }];
  }

  removePhoneRow(index: number) {
    this.contactForm.phoneNumbers = this.contactForm.phoneNumbers.filter((_, i) => i !== index);
  }

  addEmailRow() {
    this.contactForm.emails = [...this.contactForm.emails, { email: '', label: '' }];
  }

  removeEmailRow(index: number) {
    this.contactForm.emails = this.contactForm.emails.filter((_, i) => i !== index);
  }

  openNewHouseholdForm() {
    this.editingHouseholdId = null;
    this.householdForm = this.emptyHouseholdForm();
    this.showHouseholdForm = true;
  }

  openEditHouseholdForm(household: CollectionResponse) {
    this.editingHouseholdId = household.id;
    this.householdForm = {
      name: household.name,
      street: household.street ?? '',
      city: household.city ?? '',
      postalCode: household.postalCode ?? '',
      country: household.country ?? '',
    };
    this.showHouseholdForm = true;
  }

  cancelHouseholdForm() {
    this.showHouseholdForm = false;
    this.editingHouseholdId = null;
  }

  submitHouseholdForm() {
    if (!this.householdForm.name) return;

    const request = {
      name: this.householdForm.name,
      street: this.householdForm.street || null,
      city: this.householdForm.city || null,
      postalCode: this.householdForm.postalCode || null,
      country: this.householdForm.country || null,
    };

    const existing = this.editingHouseholdId ? this.households.find((h) => h.id === this.editingHouseholdId) : null;

    const request$ = this.editingHouseholdId
      ? this.collectionsApi.update(this.editingHouseholdId, { ...request, color: existing?.color ?? '#94a3b8' })
      : this.collectionsApi.create({ ...request, type: 'Household', color: '#94a3b8', parentCollectionId: null });

    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.households = (
          this.editingHouseholdId ? this.households.map((h) => (h.id === saved.id ? saved : h)) : [...this.households, saved]
        ).sort((a, b) => a.name.localeCompare(b.name));
        this.showHouseholdForm = false;
        this.editingHouseholdId = null;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('contacts.errors.save_household'));
        this.cdr.markForCheck();
      },
    });
  }

  deleteContact(contact: NodeResponse) {
    this.removing.run(this.nodesApi.delete(contact.id), contact.id).subscribe({
      next: () => {
        if (this.selectedContactId === contact.id) this.selectedContactId = null; // reload() picks the first contact
        this.reload(true);
      },
      error: () => {
        this.errorMessage = this.transloco.translate('contacts.errors.delete');
        this.cdr.markForCheck();
      },
    });
  }

  openNewContactForm() {
    this.editingContactId = null;
    this.contactForm = this.emptyContactForm();
    this.showContactForm = true;
  }

  openEditContactForm(contact: NodeResponse) {
    this.editingContactId = contact.id;
    this.selectedContactId = contact.id;
    this.contactForm = {
      firstName: contact.firstName ?? '',
      lastName: contact.lastName ?? '',
      dateOfBirth: contact.dateOfBirth ? contact.dateOfBirth.slice(0, 10) : '',
      householdId: contact.collectionId ?? '',
      street: contact.street ?? '',
      city: contact.city ?? '',
      postalCode: contact.postalCode ?? '',
      country: contact.country ?? '',
      phoneNumbers: contact.phoneNumbers.map((p) => ({ number: p.number, label: p.label ?? '' })),
      emails: contact.emails.map((e) => ({ email: e.email, label: e.label ?? '' })),
    };
    this.showContactForm = true;
  }

  cancelContactForm() {
    this.showContactForm = false;
    this.editingContactId = null;
  }

  submitContactForm() {
    if (!this.contactForm.firstName) return;

    const phoneNumbers = this.contactForm.phoneNumbers
      .map((p) => ({ number: p.number.trim(), label: p.label.trim() || null }))
      .filter((p) => p.number.length > 0);
    const emails = this.contactForm.emails
      .map((e) => ({ email: e.email.trim(), label: e.label.trim() || null }))
      .filter((e) => e.email.length > 0);

    const common = {
      description: null,
      from: null,
      until: null,
      assignedFamilyMemberIds: [],
      collectionId: this.contactForm.householdId || null,
      priority: null,
      sectionId: null,
      location: null,
      allDay: null,
      recurrenceRule: null,
      firstName: this.contactForm.firstName,
      lastName: this.contactForm.lastName || null,
      dateOfBirth: this.contactForm.dateOfBirth || null,
      street: this.contactForm.street || null,
      city: this.contactForm.city || null,
      postalCode: this.contactForm.postalCode || null,
      country: this.contactForm.country || null,
      phoneNumbers,
      emails,
      ...NULL_NOTE_FIELDS,
    };

    const title = this.contactForm.lastName ? `${this.contactForm.firstName} ${this.contactForm.lastName}` : this.contactForm.firstName;

    const request$ = this.editingContactId
      ? this.nodesApi.update(this.editingContactId, { ...common, title, isCompleted: null })
      : this.nodesApi.create({ ...common, type: 'Contact', title });

    this.submit.run(request$).subscribe({
      next: (saved) => {
        this.savedContact = saved;
        this.selectedContactId = saved.id;
        this.showContactForm = false;
        this.editingContactId = null;
        this.reload(true);
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, this.transloco.translate('contacts.errors.save'));
        this.cdr.markForCheck();
      },
    });
  }

  loadMore() {
    this.contactList.loadingMore = true;
    this.contactList.more().subscribe({
      next: () => this.finishLoadMore(),
      error: () => {
        this.errorMessage = this.transloco.translate('contacts.errors.load');
        this.finishLoadMore();
      },
    });
  }

  private finishLoadMore() {
    this.contactList.loadingMore = false;
    this.cdr.markForCheck();
  }

  private emptyHouseholdForm() {
    return { name: '', street: '', city: '', postalCode: '', country: '' };
  }

  private emptyContactForm() {
    return {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      householdId: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      phoneNumbers: [] as { number: string; label: string }[],
      emails: [] as { email: string; label: string }[],
    };
  }
}
