import { TestBed } from '@angular/core/testing';
import { Families } from './families';

describe('Families', () => {
  let service: Families;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Families);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
