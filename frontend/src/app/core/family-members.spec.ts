import { TestBed } from '@angular/core/testing';
import { FamilyMembers } from './family-members';

describe('FamilyMembers', () => {
  let service: FamilyMembers;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FamilyMembers);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
