import { TestBed } from '@angular/core/testing';

import { GroupStore } from './group-store';

describe('GroupStore', () => {
  let service: GroupStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GroupStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
