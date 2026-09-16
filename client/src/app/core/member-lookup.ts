import { FamilyMemberResponse } from './models';

/** Was reimplemented identically in Notes/Calendar/Task-list/Schedule-editor's page components. */
export function memberName(members: FamilyMemberResponse[], id: string): string {
  return members.find((m) => m.id === id)?.displayName ?? '?';
}

/** Was reimplemented identically in Notes/Calendar/Task-list's page components. */
export function memberColor(members: FamilyMemberResponse[], id: string): string {
  return members.find((m) => m.id === id)?.color ?? '#999';
}
