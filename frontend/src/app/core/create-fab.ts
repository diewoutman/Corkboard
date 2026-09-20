import { Service, signal } from '@angular/core';
import { Subject } from 'rxjs';

/** What the global "+" sheet can create, each with its full editor. */
export type CreateKind = 'task' | 'note' | 'event';

export const CREATE_KINDS: { kind: CreateKind; icon: string }[] = [
  { kind: 'task', icon: '✅' },
  { kind: 'note', icon: '📝' },
  { kind: 'event', icon: '📅' },
];

/** What the page you are on tells the "+" button. */
export interface PageContext {
  /** Which editor the sheet starts on. Pages that only have their own editor (contacts, family members, a schedule) pass `open` instead. */
  kind: CreateKind | null;
  /** Task editor: the list a new task starts in. */
  taskListId?: string | null;
  /** The page's own editor, opened directly by the button when it is not one of the global kinds. */
  open?: () => void;
}

const LAST_KEY = 'corkboard.lastCreateKind';

/**
 * The single handler behind the floating "+" button. It opens a sheet with a Task / Note / Event selector and that
 * kind's full editor, in place — the page underneath never changes. The page only decides which editor is selected
 * first (its own; on the dashboard the one used last) and tells the sheet where a new task should go.
 */
@Service()
export class CreateFab {
  readonly context = signal<PageContext | null>(null);
  readonly sheetOpen = signal(false);
  readonly selected = signal<CreateKind>('task');
  /** A page hides the button while creating something makes no sense (dashboard edit mode). */
  readonly hidden = signal(false);

  /** Emits after the sheet saved something, so the page underneath can refresh. */
  readonly created = new Subject<CreateKind>();

  /** Registers the current page's context; returns the function that removes it again (call it on destroy). */
  register(context: PageContext): () => void {
    this.context.set(context);
    return () => {
      if (this.context() === context) this.context.set(null);
    };
  }

  /** The button was tapped. */
  press() {
    const page = this.context();
    if (page?.open) {
      page.open();
      return;
    }
    this.selected.set(page?.kind ?? this.last() ?? 'task');
    this.sheetOpen.set(true);
  }

  select(kind: CreateKind) {
    this.selected.set(kind);
    this.remember(kind);
  }

  close() {
    this.sheetOpen.set(false);
  }

  /** An editor in the sheet saved: remember it as the last used one and let the page refresh. */
  saved(kind: CreateKind) {
    this.remember(kind);
    this.close();
    this.created.next(kind);
  }

  private last(): CreateKind | null {
    try {
      const value = localStorage.getItem(LAST_KEY);
      return CREATE_KINDS.find((k) => k.kind === value)?.kind ?? null;
    } catch {
      return null;
    }
  }

  private remember(kind: CreateKind) {
    try {
      localStorage.setItem(LAST_KEY, kind);
    } catch {
      // Storage can be unavailable (private mode); the sheet then starts on the page's own editor or Task.
    }
  }
}
