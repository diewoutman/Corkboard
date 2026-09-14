// Mirrors Corkboard.Contracts on the backend — keep these two in sync by hand for
// now (see CONCEPT.md §3.2 on Corkboard.Contracts being the source of truth).

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  userId: string;
  email: string;
  familyId: string | null;
  role: string | null;
}

export interface CreateFamilyRequest {
  name: string;
  timeZone: string;
  ownerDisplayName: string;
  ownerColor: string;
}

export interface FamilyResponse {
  id: string;
  name: string;
  timeZone: string;
  createdAt: string;
}

export interface AuthenticatedFamilyResponse {
  family: FamilyResponse;
  authResponse: AuthResponse;
}

export interface CreateFamilyMemberRequest {
  displayName: string;
  color: string;
  avatarUrl: string | null;
  linkedUserId: string | null;
  dateOfBirth: string | null;
}

export type UpdateFamilyMemberRequest = CreateFamilyMemberRequest;

export interface FamilyMemberResponse {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  linkedUserId: string | null;
  dateOfBirth: string | null;
}

export type NodeType = 'Note' | 'Task' | 'Appointment';

export interface CreateNodeRequest {
  type: NodeType;
  title: string;
  description: string | null;
  from: string | null;
  until: string | null;
  assignedFamilyMemberIds: string[];
  collectionId: string | null;
  priority: number | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
}

export interface UpdateNodeRequest {
  title: string;
  description: string | null;
  from: string | null;
  until: string | null;
  assignedFamilyMemberIds: string[];
  collectionId: string | null;
  isCompleted: boolean | null;
  priority: number | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
}

export interface NodeResponse {
  id: string;
  type: NodeType;
  title: string;
  description: string | null;
  from: string | null;
  until: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string;
  assignedFamilyMemberIds: string[];
  collectionId: string | null;
  isCompleted: boolean | null;
  completedAt: string | null;
  priority: number | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
}

// "Collection" is a backend-only concept — the client only ever talks about its
// user-facing framing (a "Task list", a "Calendar", or a "Schedule" — the last
// two are the same shape, a Schedule is just filled in via the weekly editor
// instead of one-off dated events). See CONCEPT.md on Collection/CollectionType.
export type CollectionType = 'TaskList' | 'Calendar' | 'Schedule';

export interface CreateCollectionRequest {
  name: string;
  type: CollectionType;
  color: string;
  parentCollectionId: string | null;
}

export interface UpdateCollectionRequest {
  name: string;
  color: string;
}

export interface CollectionResponse {
  id: string;
  name: string;
  type: CollectionType;
  color: string;
  parentCollectionId: string | null;
  createdAt: string;
  nodeCount: number;
  incompleteCount: number | null;
  feedUrl: string | null;
}

export interface OccurrenceResponse {
  appointmentId: string;
  collectionId: string;
  originalDate: string;
  from: string;
  until: string | null;
  title: string;
  location: string | null;
  allDay: boolean;
  isException: boolean;
  isRecurring: boolean;
  assignedFamilyMemberIds: string[];
}

export interface SetOccurrenceExceptionRequest {
  isSkipped: boolean;
  overrideTitle: string | null;
  overrideLocation: string | null;
  overrideFrom: string | null;
  overrideUntil: string | null;
}

export interface ImportIcsResult {
  importedCount: number;
}
