import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Page, fetchAll, fetchPage } from './paging';
import { CreateNodeRequest, NodeResponse, NodeType, UpdateNodeRequest } from './models';

export interface NodeListFilter {
  type?: NodeType;
  assignedTo?: string;
  collectionId?: string;
  from?: string;
  until?: string;
  /** Tasks only. */
  isCompleted?: boolean;
  /** Notes only. */
  isImportant?: boolean;
  /** Only Nodes with no Collection at all — a tree's root level (e.g. Recipes). Distinct from omitting `collectionId`, which leaves every Collection unfiltered. */
  unfiled?: boolean;
  /** Due window on `until`: on/after dueFrom, strictly before dueUntil. Nodes without a due date never match; overdue ones do. */
  dueFrom?: string;
  dueUntil?: string;
  scope?: 'Family' | 'Personal';
  /** Tasks only. */
  sectionId?: string;
  /** Tasks only, exact match. */
  priority?: number;
  /** Case-insensitive match on title or description. */
  search?: string;
  /** createdAt (default), updatedAt, title, due, until or priority; a "-" prefix sorts descending. */
  sort?: string;
  /** 1-based; the API pages every list (pageSize 1–50, default 50). */
  page?: number;
  pageSize?: number;
}

/** An update request that changes nothing except `overrides` — PUT replaces the whole node, so everything else is copied over. */
export function toUpdateRequest(task: NodeResponse, overrides: Partial<UpdateNodeRequest>): UpdateNodeRequest {
  return {
    title: task.title,
    description: task.description,
    from: task.from,
    until: task.until,
    assignedFamilyMemberIds: task.assignedFamilyMemberIds,
    collectionId: task.collectionId,
    isImportant: task.isImportant,
    isCompleted: task.isCompleted,
    priority: task.priority,
    sectionId: task.sectionId,
    quantity: task.quantity,
    unit: task.unit,
    location: task.location,
    allDay: task.allDay,
    recurrenceRule: task.recurrenceRule,
    firstName: task.firstName,
    lastName: task.lastName,
    dateOfBirth: task.dateOfBirth,
    street: task.street,
    city: task.city,
    postalCode: task.postalCode,
    country: task.country,
    phoneNumbers: task.phoneNumbers,
    emails: task.emails,
    servings: task.servings,
    ingredients: task.ingredients,
    steps: task.steps,
    sourceUrl: task.sourceUrl,
    recipeId: task.recipeId,
    plannedServings: task.plannedServings,
    ...overrides,
  };
}

/** Spread into a Create/UpdateNodeRequest for any non-Contact node type. */
export const NULL_CONTACT_FIELDS = {
  firstName: null,
  lastName: null,
  dateOfBirth: null,
  street: null,
  city: null,
  postalCode: null,
  country: null,
  phoneNumbers: null,
  emails: null,
} as const;

/** Spread into a Create/UpdateNodeRequest for any non-Note node type. */
export const NULL_NOTE_FIELDS = {
  isImportant: null,
} as const;

/** Spread into a Create/UpdateNodeRequest for any non-Recipe node type. */
export const NULL_RECIPE_FIELDS = {
  servings: null,
  ingredients: null,
  steps: null,
  sourceUrl: null,
} as const;

/** Spread into a Create/UpdateNodeRequest for any non-Meal node type. */
export const NULL_MEAL_FIELDS = {
  recipeId: null,
  plannedServings: null,
} as const;

/** Spread into a Create/UpdateNodeRequest for a Task that isn't a shopping-list item. */
export const NULL_SHOPPING_FIELDS = {
  quantity: null,
  unit: null,
} as const;

/** Builds the UpdateNodeRequest to toggle a Task's done state, preserving its other fields — used by every compact task checkbox (Today/Upcoming/Tasks widget). */
export function toggleTaskCompletionRequest(task: NodeResponse, isCompleted: boolean): UpdateNodeRequest {
  return {
    title: task.title,
    description: task.description,
    from: task.from,
    until: task.until,
    assignedFamilyMemberIds: task.assignedFamilyMemberIds,
    collectionId: task.collectionId,
    isImportant: null,
    isCompleted,
    priority: task.priority,
    sectionId: task.sectionId,
    quantity: task.quantity,
    unit: task.unit,
    location: null,
    allDay: null,
    recurrenceRule: task.recurrenceRule,
    ...NULL_CONTACT_FIELDS,
    ...NULL_RECIPE_FIELDS,
    ...NULL_MEAL_FIELDS,
  };
}

@Service()
export class Nodes {
  private readonly http = inject(HttpClient);

  /** Every match, fetched page by page — for screens that need the whole set. Use listPage() for long, scrolling lists. */
  list(filter: Omit<NodeListFilter, 'page' | 'pageSize'> = {}) {
    return fetchAll<NodeResponse>(this.http, `${environment.apiUrl}/nodes`, { ...filter });
  }

  /** One page (page defaults to 1, pageSize to 50, the maximum) plus the total match count. */
  listPage(filter: NodeListFilter): Observable<Page<NodeResponse>> {
    const { page, pageSize, ...rest } = filter;
    return fetchPage<NodeResponse>(this.http, `${environment.apiUrl}/nodes`, { ...rest }, page, pageSize);
  }

  get(id: string) {
    return this.http.get<NodeResponse>(`${environment.apiUrl}/nodes/${id}`);
  }

  create(request: CreateNodeRequest) {
    return this.http.post<NodeResponse>(`${environment.apiUrl}/nodes`, request);
  }

  update(id: string, request: UpdateNodeRequest) {
    return this.http.put<NodeResponse>(`${environment.apiUrl}/nodes/${id}`, request);
  }

  delete(id: string) {
    return this.http.delete<void>(`${environment.apiUrl}/nodes/${id}`);
  }
}
