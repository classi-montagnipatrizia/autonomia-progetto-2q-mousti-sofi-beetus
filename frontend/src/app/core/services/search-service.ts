import { inject, Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { UserService } from '../api/user-service';
import { PostService } from '../api/post-service';
import { UserSummaryDTO, PostResponseDTO } from '../../models';

@Injectable({
  providedIn: 'root',
})
export class SearchService {
  private readonly userService = inject(UserService);
  private readonly postService = inject(PostService);

  /**
   * Ricerca globale in tutte le entità (utenti, post)
   *
   * Esegue ricerche parallele e combina i risultati
   * Utile per barra di ricerca globale
   *
   * @param searchTerm termine di ricerca
   * @returns risultati combinati da tutte le fonti
   */
  globalSearch(searchTerm: string): Observable<GlobalSearchResults> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return of({
        users: [],
        posts: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          size: 0,
          number: 0,
          first: true,
          last: true,
          empty: true,
        },
      });
    }

    // Ricerca parallela in tutte le entità
    return forkJoin({
      users: this.userService.searchUsers(searchTerm, 0, 5), // Primi 5 utenti
      posts: this.postService.searchPosts(searchTerm, 0, 5), // Primi 5 post
    }).pipe(
      map((results) => ({
        users: results.users.content,
        posts: results.posts,
      }))
    );
  }

  /**
   * Ricerca solo utenti
   *
   * Wrapper per UserService.searchUsers con default ottimizzati
   *
   * @param searchTerm termine di ricerca
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  searchUsers(
    searchTerm: string,
    page: number = 0,
    size: number = 20
  ): Observable<UserSummaryDTO[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return of([]);
    }

    return this.userService
      .searchUsers(searchTerm, page, size)
      .pipe(map((result) => result.content));
  }

  /**
   * Ricerca solo post
   *
   * Wrapper per PostService.searchPosts
   *
   * @param searchTerm termine di ricerca
   * @param page numero pagina (default 0)
   * @param size elementi per pagina (default 20)
   */
  searchPosts(
    searchTerm: string,
    page: number = 0,
    size: number = 20
  ): Observable<PostResponseDTO[]> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return of([]);
    }

    return this.postService
      .searchPosts(searchTerm, page, size)
      .pipe(map((result) => result.content));
  }

  /**
   * Ottiene suggerimenti per menzioni @username
   *
   * Utilizzato per autocomplete durante la scrittura di post/commenti
   * Cerca username che iniziano con il prefisso fornito
   *
   * @param prefix prefisso username (es: "gio" per "@giovanni")
   */
  getMentionSuggestions(prefix: string): Observable<UserSummaryDTO[]> {
    if (!prefix || prefix.trim().length === 0) {
      return of([]);
    }

    // Rimuove @ se presente
    const cleanPrefix = prefix.startsWith('@') ? prefix.substring(1) : prefix;

    return this.userService.getMentionSuggestions(cleanPrefix);
  }

  /**
   * Verifica disponibilità username
   *
   * Utilizzato per validazione real-time durante registrazione
   *
   * @param username username da verificare
   */
  checkUsernameAvailability(username: string): Observable<boolean> {
    if (!username || username.trim().length === 0) {
      return of(false);
    }

    return this.userService
      .checkUsernameAvailability(username)
      .pipe(map((result) => result.disponibile));
  }

  /**
   * Verifica disponibilità email
   *
   * Utilizzato per validazione real-time durante registrazione
   *
   * @param email email da verificare
   */
  checkEmailAvailability(email: string): Observable<boolean> {
    if (!email || email.trim().length === 0) {
      return of(false);
    }

    return this.userService.checkEmailAvailability(email).pipe(map((result) => result.disponibile));
  }

  /**
   * Ricerca con debounce per input real-time
   *
   * Utile per barre di ricerca che inviano richieste mentre l'utente digita
   * Applica debounce di 300ms e evita richieste duplicate
   *
   * @param searchTerm$ Observable del termine di ricerca
   * @returns Observable con risultati ricerca globale
   */
  searchWithDebounce(searchTerm$: Observable<string>): Observable<GlobalSearchResults> {
    return searchTerm$.pipe(
      debounceTime(300), // Attende 300ms dopo che l'utente smette di digitare
      distinctUntilChanged(), // Evita richieste duplicate con stesso termine
      map((term) => term.trim()),
      switchMap((term) => {
        if (term.length === 0) {
          return of({
            users: [],
            posts: {
              content: [],
              totalElements: 0,
              totalPages: 0,
              size: 0,
              number: 0,
              first: true,
              last: true,
              empty: true,
            },
          });
        }
        return this.globalSearch(term);
      })
    );
  }

  /**
   * Filtra risultati di ricerca per tipo
   *
   * Utile per tab di ricerca (es: "Tutti", "Utenti", "Post")
   *
   * @param results risultati ricerca globale
   * @param type tipo di risultati da mantenere
   */
  filterResultsByType(results: GlobalSearchResults, type: SearchFilterType): GlobalSearchResults {
    switch (type) {
      case 'users':
        return {
          users: results.users,
          posts: {
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
            first: true,
            last: true,
            empty: true,
          },
        };
      case 'posts':
        return {
          users: [],
          posts: results.posts,
        };
      case 'all':
      default:
        return results;
    }
  }

  /**
   * Conta totale risultati di ricerca
   *
   * @param results risultati ricerca globale
   * @returns numero totale di risultati
   */
  getTotalResultsCount(results: GlobalSearchResults): number {
    return results.users.length + results.posts.content.length;
  }

  /**
   * Verifica se ci sono risultati
   *
   * @param results risultati ricerca globale
   */
  hasResults(results: GlobalSearchResults): boolean {
    return this.getTotalResultsCount(results) > 0;
  }
}

/**
 * Risultati di ricerca globale combinati
 */
export interface GlobalSearchResults {
  /** Utenti trovati */
  users: UserSummaryDTO[];

  /** Post trovati (paginati) */
  posts: {
    content: PostResponseDTO[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
  };
}

/**
 * Tipi di filtro per risultati ricerca
 */
export type SearchFilterType = 'all' | 'users' | 'posts';
