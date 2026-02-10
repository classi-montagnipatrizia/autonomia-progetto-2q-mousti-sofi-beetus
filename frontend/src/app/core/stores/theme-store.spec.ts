import { TestBed } from '@angular/core/testing';

import { ThemeStore } from './theme-store';

describe('ThemeStore', () => {
  let service: ThemeStore;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeStore);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
