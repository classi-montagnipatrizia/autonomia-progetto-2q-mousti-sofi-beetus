import { Injectable } from '@angular/core';
import { PostResponseDTO } from '../../models';

interface FeedSnapshot {
  posts: PostResponseDTO[];
  page: number;
  hasMore: boolean;
  scrollY: number;
}

@Injectable({ providedIn: 'root' })
export class FeedStateService {
  private snapshot: FeedSnapshot | null = null;

  save(posts: PostResponseDTO[], page: number, hasMore: boolean, scrollY: number): void {
    this.snapshot = { posts, page, hasMore, scrollY };
  }

  consume(): FeedSnapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }
}
