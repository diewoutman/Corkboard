import { TestBed } from '@angular/core/testing';
import { Nodes } from './nodes';

describe('Nodes', () => {
  let service: Nodes;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Nodes);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
