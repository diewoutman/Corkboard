import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

/** The API pages every list endpoint and caps pageSize at 50. */
export const PAGE_SIZE = 50;

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

export interface Page<T> {
  items: T[];
  /** How many items matched in total, before paging (the X-Total-Count header). */
  total: number;
}

function toParams(params: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null) httpParams = httpParams.set(key, value);
  }
  return httpParams;
}

/**
 * State for a "load more" list: first() loads page 1 (replacing what was there), more() appends the next page.
 * Only the pages the user actually reaches are ever requested.
 */
export class PagedList<T> {
  items: T[] = [];
  total = 0;
  loadingMore = false;
  private page = 0;

  constructor(private readonly load: (page: number) => Observable<Page<T>>) {}

  get hasMore(): boolean {
    return this.items.length < this.total;
  }

  first(): Observable<void> {
    return this.load(1).pipe(
      map((result) => {
        this.page = 1;
        this.items = result.items;
        this.total = result.total;
      }),
    );
  }

  more(): Observable<void> {
    const next = this.page + 1;
    return this.load(next).pipe(
      map((result) => {
        this.page = next;
        this.items = [...this.items, ...result.items];
        this.total = result.total;
      }),
    );
  }
}

/** One page of a list endpoint. */
export function fetchPage<T>(http: HttpClient, url: string, params: QueryParams = {}, page = 1, pageSize = PAGE_SIZE): Observable<Page<T>> {
  return http.get<T[]>(url, { params: toParams({ ...params, page, pageSize }), observe: 'response' }).pipe(
    map((res) => ({ items: res.body ?? [], total: Number(res.headers.get('X-Total-Count') ?? res.body?.length ?? 0) })),
  );
}

/**
 * Every item of a list endpoint, for screens that need the whole (small) set — a dropdown, the calendar's
 * window. Fetches page 1, then the remaining pages in parallel.
 */
export function fetchAll<T>(http: HttpClient, url: string, params: QueryParams = {}): Observable<T[]> {
  return fetchPage<T>(http, url, params).pipe(
    switchMap((first) => {
      const pages = Math.ceil(first.total / PAGE_SIZE);
      if (pages <= 1) return of(first.items);
      const rest = Array.from({ length: pages - 1 }, (_, i) => fetchPage<T>(http, url, params, i + 2));
      return forkJoin(rest).pipe(map((others) => [...first.items, ...others.flatMap((p) => p.items)]));
    }),
  );
}
