import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Auth } from '../../core/auth';
import { FamilyMembers } from '../../core/family-members';
import { FamilyMemberResponse, NodeResponse, NodeType, UpdateNodeRequest } from '../../core/models';
import { Nodes } from '../../core/nodes';

@Component({
  selector: 'app-board',
  templateUrl: './board.page.html',
  styleUrls: ['./board.page.scss'],
  standalone: false,
})
export class BoardPage implements OnInit {
  members: FamilyMemberResponse[] = [];
  nodes: NodeResponse[] = [];
  filterType: NodeType | 'All' = 'All';
  loading = true;
  errorMessage: string | null = null;

  showNewNodeForm = false;
  newNode = this.emptyNewNode();

  constructor(
    private readonly nodesApi: Nodes,
    private readonly membersApi: FamilyMembers,
    private readonly auth: Auth,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.reload();
  }

  get visibleNodes(): NodeResponse[] {
    return this.filterType === 'All' ? this.nodes : this.nodes.filter((n) => n.type === this.filterType);
  }

  reload() {
    this.loading = true;
    this.errorMessage = null;
    forkJoin({ members: this.membersApi.list(), nodes: this.nodesApi.list() }).subscribe({
      next: ({ members, nodes }) => {
        this.members = members;
        this.nodes = this.sortNodes(nodes);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not load the board. Pull to refresh to try again.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  memberName(id: string): string {
    return this.members.find((m) => m.id === id)?.displayName ?? '?';
  }

  memberColor(id: string): string {
    return this.members.find((m) => m.id === id)?.color ?? '#999';
  }

  toggleTask(node: NodeResponse) {
    if (node.type !== 'Task') return;
    this.nodesApi.update(node.id, this.toUpdateRequest(node, { isCompleted: !node.isCompleted })).subscribe({
      next: (updated) => {
        this.replaceNode(updated);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not update the task.';
        this.cdr.markForCheck();
      },
    });
  }

  deleteNode(node: NodeResponse) {
    this.nodesApi.delete(node.id).subscribe({
      next: () => {
        this.nodes = this.nodes.filter((n) => n.id !== node.id);
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Could not delete that.';
        this.cdr.markForCheck();
      },
    });
  }

  submitNewNode() {
    if (!this.newNode.title) return;

    this.nodesApi
      .create({
        type: this.newNode.type,
        title: this.newNode.title,
        description: this.newNode.description || null,
        from: this.newNode.from ? new Date(this.newNode.from).toISOString() : null,
        until: this.newNode.until ? new Date(this.newNode.until).toISOString() : null,
        assignedFamilyMemberIds: this.newNode.assignedFamilyMemberIds,
        priority: null,
        location: this.newNode.location || null,
        allDay: this.newNode.type === 'Appointment' ? this.newNode.allDay : null,
        recurrenceRule: null,
      })
      .subscribe({
        next: (created) => {
          this.nodes = this.sortNodes([...this.nodes, created]);
          this.newNode = this.emptyNewNode();
          this.showNewNodeForm = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorMessage = 'Could not create that.';
          this.cdr.markForCheck();
        },
      });
  }

  logout() {
    this.auth.logout();
    window.location.href = '/login';
  }

  private toUpdateRequest(node: NodeResponse, overrides: Partial<UpdateNodeRequest>): UpdateNodeRequest {
    return {
      title: node.title,
      description: node.description,
      from: node.from,
      until: node.until,
      assignedFamilyMemberIds: node.assignedFamilyMemberIds,
      isCompleted: node.isCompleted,
      priority: node.priority,
      location: node.location,
      allDay: node.allDay,
      recurrenceRule: node.recurrenceRule,
      ...overrides,
    };
  }

  private replaceNode(updated: NodeResponse) {
    this.nodes = this.sortNodes(this.nodes.map((n) => (n.id === updated.id ? updated : n)));
  }

  private sortNodes(nodes: NodeResponse[]): NodeResponse[] {
    return [...nodes].sort((a, b) => (a.from ?? a.createdAt).localeCompare(b.from ?? b.createdAt));
  }

  private emptyNewNode() {
    return {
      type: 'Note' as NodeType,
      title: '',
      description: '',
      from: '',
      until: '',
      location: '',
      allDay: false,
      assignedFamilyMemberIds: [] as string[],
    };
  }
}
