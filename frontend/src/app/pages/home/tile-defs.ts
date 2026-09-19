export interface TileDef {
  key: string;
  title: string;
  description: string;
  route: string;
  icon: string;
}

/** Shared by the Navigation widget and its config form — the full, fixed catalog of tiles. */
export const TILE_DEFS: TileDef[] = [
  {
    key: 'tasks',
    title: 'Tasks',
    description: 'Lists and to-dos for the whole family.',
    route: '/tasks',
    icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  },
  {
    key: 'notes',
    title: 'Notes',
    description: 'Quick notes and reminders worth keeping.',
    route: '/notes',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    key: 'calendar',
    title: 'Calendar',
    description: 'Events, calendars and weekly schedules.',
    route: '/calendar',
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    key: 'contacts',
    title: 'Contacts',
    description: 'Phone numbers, emails and addresses, by household.',
    route: '/contacts',
    icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  },
  {
    key: 'family',
    title: 'Family',
    description: 'Manage family members and their logins.',
    route: '/family',
    icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4',
  },
];

export function tileByKey(key: string | null): TileDef {
  return TILE_DEFS.find((t) => t.key === key) ?? TILE_DEFS[0];
}

export function tilesInOrder(tileOrder: string[] | null): TileDef[] {
  if (!tileOrder || tileOrder.length === 0) return TILE_DEFS;

  const byKey = new Map(TILE_DEFS.map((t) => [t.key, t]));
  const ordered = tileOrder.map((key) => byKey.get(key)).filter((t): t is TileDef => !!t);

  // Any tile not mentioned (e.g. added to the app after this widget's order was saved) still shows, appended at the end.
  const missing = TILE_DEFS.filter((t) => !tileOrder.includes(t.key));
  return [...ordered, ...missing];
}
