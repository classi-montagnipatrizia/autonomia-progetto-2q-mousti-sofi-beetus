import { TestBed } from '@angular/core/testing';

import { OnlineUsersStore } from './online-users-store';

describe('OnlineUsersStore', () => {
  let service: OnlineUsersStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OnlineUsersStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
