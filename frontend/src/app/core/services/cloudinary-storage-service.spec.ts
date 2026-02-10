import { TestBed } from '@angular/core/testing';

import { CloudinaryStorageService } from './cloudinary-storage-service';

describe('CloudinaryStorageService', () => {
  let service: CloudinaryStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CloudinaryStorageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
