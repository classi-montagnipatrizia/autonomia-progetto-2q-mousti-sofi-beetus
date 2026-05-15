import { Injectable } from '@angular/core';
import { PostResponseDTO } from '../../models';

interface ProfileSnapshot {
  userId: number;
  posts: PostResponseDTO[];
  page: number;
  totalPages: number;
  scrollY: number;
}

@Injectable({ providedIn: 'root' })
export class ProfileStateService {
  private snapshot: ProfileSnapshot | null = null;

  save(userId: number, posts: PostResponseDTO[], page: number, totalPages: number, scrollY: number): void {
    this.snapshot = { userId, posts, page, totalPages, scrollY };
  }

  consume(userId: number): ProfileSnapshot | null {
    if (this.snapshot?.userId === userId) {
      const s = this.snapshot;
      this.snapshot = null;
      return s;
    }
    return null;
  }
}
