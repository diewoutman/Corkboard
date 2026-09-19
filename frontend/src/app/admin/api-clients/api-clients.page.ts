import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ApiClients } from '../../core/api-clients';
import { extractErrorMessage } from '../../core/http-error';
import { API_SCOPE_AREAS, ApiCallLogEntryResponse, ApiClientResponse, CreatedApiClientResponse } from '../../core/models';

@Component({
  selector: 'app-api-clients',
  templateUrl: './api-clients.page.html',
  styleUrls: ['./api-clients.page.scss'],
  standalone: false,
})
export class ApiClientsPage implements OnInit {
  readonly scopeAreas = API_SCOPE_AREAS;

  clients: ApiClientResponse[] = [];
  loading = true;
  errorMessage: string | null = null;

  showCreateForm = false;
  createForm = this.emptyCreateForm();

  /** Set right after a successful create — the only time the plaintext secret is ever available. */
  justCreated: CreatedApiClientResponse | null = null;

  expandedClientId: string | null = null;
  callLog: ApiCallLogEntryResponse[] = [];
  callLogLoading = false;

  constructor(
    private readonly apiClientsApi: ApiClients,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    this.apiClientsApi.list().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load API clients. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  openCreateForm() {
    this.createForm = this.emptyCreateForm();
    this.justCreated = null;
    this.showCreateForm = true;
  }

  cancelCreateForm() {
    this.showCreateForm = false;
  }

  toggleScope(area: string) {
    this.createForm.scopeAreas[area] = !this.createForm.scopeAreas[area];
  }

  submitCreateForm() {
    if (!this.createForm.name) return;

    const scopes = this.scopeAreas.flatMap((area) => {
      const granted: string[] = [];
      if (this.createForm.scopeAreas[`${area}:read`]) granted.push(`${area}:read`);
      if (this.createForm.scopeAreas[`${area}:write`]) granted.push(`${area}:write`);
      return granted;
    });

    this.apiClientsApi.create({ name: this.createForm.name, scopes }).subscribe({
      next: (created) => {
        this.clients = [...this.clients, created.client];
        this.justCreated = created;
        this.showCreateForm = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorMessage = extractErrorMessage(err, 'Could not create that API client.');
        this.cdr.markForCheck();
      },
    });
  }

  dismissSecret() {
    this.justCreated = null;
  }

  revoke(client: ApiClientResponse) {
    this.apiClientsApi.revoke(client.id).subscribe({
      next: () => {
        this.clients = this.clients.map((c) => (c.id === client.id ? { ...c, isRevoked: true } : c));
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not revoke that API client.';
        this.cdr.markForCheck();
      },
    });
  }

  toggleCallLog(client: ApiClientResponse) {
    if (this.expandedClientId === client.id) {
      this.expandedClientId = null;
      return;
    }

    this.expandedClientId = client.id;
    this.callLog = [];
    this.callLogLoading = true;
    this.apiClientsApi.callLog(client.id).subscribe({
      next: (entries) => {
        this.callLog = entries;
        this.callLogLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load the call log for that client.';
        this.callLogLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private emptyCreateForm(): { name: string; scopeAreas: Record<string, boolean> } {
    return { name: '', scopeAreas: {} };
  }
}
