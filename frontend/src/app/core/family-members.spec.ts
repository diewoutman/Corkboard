import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { FamilyMembers } from './family-members';

describe('FamilyMembers', () => {
  let service: FamilyMembers;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(FamilyMembers);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('serves a second list() from the cache instead of the network', () => {
    service.list().subscribe();
    http.expectOne((r) => r.url.endsWith('/family-members')).flush([], { headers: { 'X-Total-Count': '0' } });

    service.list().subscribe();
    http.expectNone((r) => r.url.endsWith('/family-members'));
  });

  it('refetches after a member changes', () => {
    service.list().subscribe();
    http.expectOne((r) => r.url.endsWith('/family-members')).flush([], { headers: { 'X-Total-Count': '0' } });

    service.delete('abc').subscribe();
    http.expectOne((r) => r.method === 'DELETE').flush(null);

    service.list().subscribe();
    http.expectOne((r) => r.url.endsWith('/family-members'));
  });
});
