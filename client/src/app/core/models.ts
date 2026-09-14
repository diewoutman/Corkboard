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
  isCompleted: boolean | null;
  completedAt: string | null;
  priority: number | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
}
