import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PagedList, fetchAll, fetchPage } from './paging';

describe('paging', () => {
  let http: HttpClient;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('fetchPage sends page + pageSize and reads the total from X-Total-Count', () => {
    let result: unknown;
    fetchPage<number>(http, '/api/x', { scope: 'Family' }, 2).subscribe((r) => (result = r));

    const req = backend.expectOne((r) => r.url === '/api/x');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('50');
    expect(req.request.params.get('scope')).toBe('Family');
    req.flush([1, 2], { headers: { 'X-Total-Count': '120' } });

    expect(result).toEqual({ items: [1, 2], total: 120 });
  });

  it('fetchAll walks every page and concatenates them', () => {
    let result: number[] = [];
    fetchAll<number>(http, '/api/x').subscribe((r) => (result = r));

    backend.expectOne((r) => r.params.get('page') === '1').flush([1], { headers: { 'X-Total-Count': '101' } });
    backend.expectOne((r) => r.params.get('page') === '2').flush([2], { headers: { 'X-Total-Count': '101' } });
    backend.expectOne((r) => r.params.get('page') === '3').flush([3], { headers: { 'X-Total-Count': '101' } });

    expect(result).toEqual([1, 2, 3]);
  });

  it('fetchAll makes a single request when everything fits on one page', () => {
    let result: number[] = [];
    fetchAll<number>(http, '/api/x').subscribe((r) => (result = r));

    backend.expectOne('/api/x?page=1&pageSize=50').flush([1, 2], { headers: { 'X-Total-Count': '2' } });

    expect(result).toEqual([1, 2]);
  });
});

describe('PagedList', () => {
  it('loads page 1 first, appends later pages, and knows when nothing is left', () => {
    const requested: number[] = [];
    const list = new PagedList<number>((page) => {
      requested.push(page);
      return of({ items: page === 1 ? [1, 2] : [3], total: 3 });
    });

    list.first().subscribe();
    expect(list.items).toEqual([1, 2]);
    expect(list.hasMore).toBe(true);

    list.more().subscribe();
    expect(list.items).toEqual([1, 2, 3]);
    expect(list.hasMore).toBe(false);
    expect(requested).toEqual([1, 2]); // no request beyond what was asked for
  });

  it('first() starts over', () => {
    const list = new PagedList<number>(() => of({ items: [9], total: 1 }));
    list.first().subscribe();
    list.more().subscribe();
    list.first().subscribe();
    expect(list.items).toEqual([9]);
  });
});
