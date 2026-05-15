import { Injectable } from '@angular/core';
import { PostResponseDTO } from '../../models';

interface FeedSnapshot {
  posts: PostResponseDTO[];
  page: number;
  hasMore: boolean;
  scrollPostId: string;
}

@Injectable({ providedIn: 'root' })
export class FeedStateService {
  private snapshot: FeedSnapshot | null = null;

  save(posts: PostResponseDTO[], page: number, hasMore: boolean, scrollPostId: string): void {
    this.snapshot = { posts, page, hasMore, scrollPostId };
  }

  consume(): FeedSnapshot | null {
    const s = this.snapshot;
    this.snapshot = null;
    return s;
  }
}
