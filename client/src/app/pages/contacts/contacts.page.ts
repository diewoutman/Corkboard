import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Collections } from '../../core/collections';
import { extractErrorMessage } from '../../core/http-error';
import { CollectionResponse, NodeResponse } from '../../core/models';
import { Nodes } from '../../core/nodes';

@Component({
  selector: 'app-contacts',
  templateUrl: './contacts.page.html',
  styleUrls: ['./contacts.page.scss'],
  standalone: false,
})
export class ContactsPage implements OnInit {
  households: CollectionResponse[] = [];
  contacts: NodeResponse[] = [];

  loading = true;
  errorMessage: string | null = null;

  showHouseholdsPanel = false;
  showNewHouseholdForm = false;
  newHousehold = this.emptyNewHousehold();

  showNewContactForm = false;
  newContact = this.emptyNewContact();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly collectionsApi: Collections,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({
      households: this.collectionsApi.list({ type: 'Household' }),
      contacts: this.nodesApi.list({ type: 'Contact' }),
    }).subscribe({
      next: ({ households, contacts }) => {
        this.households = households.sort((a, b) => a.name.localeCompare(b.name));
        this.contacts = this.sortContacts(contacts);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load your contacts. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  householdName(id: string | null): string | null {
    if (!id) return null;
    return this.households.find((h) => h.id === id)?.name ?? null;
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
    this.newContact.phoneNumbers = [...this.newContact.phoneNumbers, { number: '', label: '' }];
  }

  removePhoneRow(index: number) {
    this.newContact.phoneNumbers = this.newContact.phoneNumbers.filter((_, i) => i !== index);
  }

  addEmailRow() {
    this.newContact.emails = [...this.newContact.emails, { email: '', label: '' }];
  }

  removeEmailRow(index: number) {
    this.newContact.emails = this.newContact.emails.filter((_, i) => i !== index);
  }

  submitNewHousehold() {
    if (!this.newHousehold.name) return;

    this.collectionsApi
      .create({
        name: this.newHousehold.name,
        type: 'Household',
        color: '#94a3b8',
        parentCollectionId: null,
        street: this.newHousehold.street || null,
        city: this.newHousehold.city || null,
        postalCode: this.newHousehold.postalCode || null,
        country: this.newHousehold.country || null,
      })
      .subscribe({
        next: (created) => {
          this.households = [...this.households, created].sort((a, b) => a.name.localeCompare(b.name));
          this.newHousehold = this.emptyNewHousehold();
          this.showNewHouseholdForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that household.');
          this.cdr.markForCheck();
        },
      });
  }

  deleteContact(contact: NodeResponse) {
    this.nodesApi.delete(contact.id).subscribe({
      next: () => {
        this.contacts = this.contacts.filter((c) => c.id !== contact.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not delete that contact.';
        this.cdr.markForCheck();
      },
    });
  }

  submitNewContact() {
    const phoneNumbers = this.newContact.phoneNumbers
      .map((p) => ({ number: p.number.trim(), label: p.label.trim() || null }))
      .filter((p) => p.number.length > 0);

    if (!this.newContact.firstName || !this.newContact.lastName || phoneNumbers.length === 0) return;

    const emails = this.newContact.emails
      .map((e) => ({ email: e.email.trim(), label: e.label.trim() || null }))
      .filter((e) => e.email.length > 0);

    this.nodesApi
      .create({
        type: 'Contact',
        title: `${this.newContact.firstName} ${this.newContact.lastName}`.trim(),
        description: null,
        from: null,
        until: null,
        assignedFamilyMemberIds: [],
        collectionId: this.newContact.householdId || null,
        priority: null,
        location: null,
        allDay: null,
        recurrenceRule: null,
        firstName: this.newContact.firstName,
        lastName: this.newContact.lastName,
        dateOfBirth: this.newContact.dateOfBirth || null,
        street: this.newContact.street || null,
        city: this.newContact.city || null,
        postalCode: this.newContact.postalCode || null,
        country: this.newContact.country || null,
        phoneNumbers,
        emails,
      })
      .subscribe({
        next: (created) => {
          this.contacts = this.sortContacts([...this.contacts, created]);
          this.newContact = this.emptyNewContact();
          this.showNewContactForm = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.errorMessage = extractErrorMessage(err, 'Could not create that contact.');
          this.cdr.markForCheck();
        },
      });
  }

  private sortContacts(contacts: NodeResponse[]): NodeResponse[] {
    return [...contacts].sort((a, b) => (a.lastName ?? '').localeCompare(b.lastName ?? '') || (a.firstName ?? '').localeCompare(b.firstName ?? ''));
  }

  private emptyNewHousehold() {
    return { name: '', street: '', city: '', postalCode: '', country: '' };
  }

  private emptyNewContact() {
    return {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      householdId: '',
      street: '',
      city: '',
      postalCode: '',
      country: '',
      phoneNumbers: [{ number: '', label: '' }] as { number: string; label: string }[],
      emails: [] as { email: string; label: string }[],
    };
  }
}
