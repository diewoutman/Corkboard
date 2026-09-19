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
  isSystemOwner: boolean;
  /** The account's stored UI language, or null until they pick one. */
  language: string | null;
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

export type FamilyRole = 'Owner' | 'Adult' | 'Member';

/** Owner-only — the sanctioned way to add a login once a Family exists (self-registration is closed then). */
export interface CreateFamilyMemberAccountRequest {
  email: string;
  password: string;
  role: FamilyRole;
}

export interface FamilyMemberResponse {
  id: string;
  displayName: string;
  color: string;
  avatarUrl: string | null;
  linkedUserId: string | null;
  dateOfBirth: string | null;
  linkedUserEmail: string | null;
  linkedUserRole: FamilyRole | null;
}

export type NodeType = 'Note' | 'Task' | 'Appointment' | 'Contact';

export interface ContactPhoneNumber {
  number: string;
  label: string | null;
}

export interface ContactEmail {
  email: string;
  label: string | null;
}

export interface CreateNodeRequest {
  type: NodeType;
  title: string;
  description: string | null;
  from: string | null;
  until: string | null;
  assignedFamilyMemberIds: string[];
  collectionId: string | null;
  // Note-only
  isImportant: boolean | null;
  priority: number | null;
  category: string | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
  // Contact-only
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumbers: ContactPhoneNumber[] | null;
  emails: ContactEmail[] | null;
}

export interface UpdateNodeRequest {
  title: string;
  description: string | null;
  from: string | null;
  until: string | null;
  assignedFamilyMemberIds: string[];
  collectionId: string | null;
  // Note-only
  isImportant: boolean | null;
  isCompleted: boolean | null;
  priority: number | null;
  category: string | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
  // Contact-only
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumbers: ContactPhoneNumber[] | null;
  emails: ContactEmail[] | null;
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
  // Note-only
  isImportant: boolean | null;
  isCompleted: boolean | null;
  completedAt: string | null;
  priority: number | null;
  category: string | null;
  location: string | null;
  allDay: boolean | null;
  recurrenceRule: string | null;
  // Contact-only
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
  phoneNumbers: ContactPhoneNumber[];
  emails: ContactEmail[];
}

// "Collection" is a backend-only concept — the client only ever talks about its
// user-facing framing (a "Task list", a "Calendar", a "Schedule" — the last two
// are the same shape, a Schedule is just filled in via the weekly editor instead
// of one-off dated events — or a "Household", which groups Contacts so they can
// share one address). See CONCEPT.md on Collection/CollectionType.
export type CollectionType = 'TaskList' | 'Calendar' | 'Schedule' | 'Household';

export interface CreateCollectionRequest {
  name: string;
  type: CollectionType;
  color: string;
  parentCollectionId: string | null;
  // Household-only
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface UpdateCollectionRequest {
  name: string;
  color: string;
  // Household-only
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
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
  // Household-only
  street: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
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

// Dashboard widgets belong to one of two dashboards (DashboardWidgetScope) —
// Personal (per-User) or Family (one shared layout, admin-managed). One flat
// shape covering every widget type's settings, same convention as
// CreateNodeRequest — see CONCEPT.md.
export type DashboardWidgetType = 'Navigation' | 'Notes' | 'Tasks' | 'Today' | 'Upcoming' | 'Shortcut' | 'Timeline';
export type DashboardWidgetScope = 'Personal' | 'Family';

export interface CreateDashboardWidgetRequest {
  type: DashboardWidgetType;
  scope: DashboardWidgetScope;
  // Applies to every type — whether the widget renders inside the card chrome or bare on the board.
  showPanel: boolean;
  // Navigation-only
  tileOrder: string[] | null;
  // Shortcut-only — which single TILE_DEFS entry this button points to.
  tileKey: string | null;
  // Notes-only
  importantOnly: boolean | null;
  // Tasks-only — a specific list, or all Tasks assigned to the caller when both are unset.
  // Timeline-only too — restricts it to Tasks/Calendar occurrences assigned to the caller
  // instead of the whole Family.
  collectionId: string | null;
  assignedToMeOnly: boolean | null;
  // Timeline-only — true for an hour-by-hour grid, false/null (default) for the dayparts layout.
  hourlyLayout: boolean | null;
}

export interface UpdateDashboardWidgetRequest {
  showPanel: boolean;
  tileOrder: string[] | null;
  tileKey: string | null;
  importantOnly: boolean | null;
  collectionId: string | null;
  assignedToMeOnly: boolean | null;
  hourlyLayout: boolean | null;
}

export interface ReorderDashboardWidgetsRequest {
  orderedWidgetIds: string[];
}

export interface UpdateDashboardWidgetSpanRequest {
  span: number;
}

export interface DashboardWidgetResponse {
  id: string;
  type: DashboardWidgetType;
  scope: DashboardWidgetScope;
  sortOrder: number;
  /** How many of the dashboard's fixed columns (1-3) this widget's card spans. */
  span: number;
  /** Whether this widget renders inside the card chrome (WidgetCardComponent) or bare, on the board directly. */
  showPanel: boolean;
  tileOrder: string[] | null;
  tileKey: string | null;
  importantOnly: boolean | null;
  collectionId: string | null;
  assignedToMeOnly: boolean | null;
  hourlyLayout: boolean | null;
}

/** Mirrors Corkboard.Contracts.ApiClients.ApiScopes.Areas on the backend. */
export const API_SCOPE_AREAS = ['nodes', 'calendar', 'collections', 'dashboard', 'family'] as const;

export interface CreateApiClientRequest {
  name: string;
  scopes: string[];
}

export interface ApiClientResponse {
  id: string;
  name: string;
  clientId: string;
  scopes: string[];
  isRevoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  /** True for exactly one row — the Angular GUI itself. Has full access via each caller's own Family role, not scopes; can't be revoked. */
  isFirstParty: boolean;
}

/** Only returned once, right after creation — the only time the plaintext secret is shown. */
export interface CreatedApiClientResponse {
  client: ApiClientResponse;
  clientSecret: string;
}

export interface ApiCallLogEntryResponse {
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  timestamp: string;
}

export interface UpdateFamilyRequest {
  name: string;
  timeZone: string;
}

export interface AdminStatsResponse {
  familyCount: number;
  userCount: number;
  apiClientCount: number;
  activeApiClientCount: number;
  familyMemberCount: number;
  nodeCount: number;
}

export interface AdminFamilySummaryResponse {
  id: string;
  name: string;
  timeZone: string;
  createdAt: string;
  memberCount: number;
  nodeCount: number;
}
