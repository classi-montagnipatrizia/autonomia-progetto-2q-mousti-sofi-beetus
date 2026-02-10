// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipo di notifica
 */
export enum NotificationType {
  MENTION = 'MENTION', // Menzione @username
  COMMENT = 'COMMENT', // Commento su un post
  LIKE = 'LIKE', // Like su un post
  DIRECT_MESSAGE = 'DIRECT_MESSAGE', // Messaggio diretto
  NEW_POST = 'NEW_POST', // Nuovo post pubblicato
}

/**
 * Tipo di contenuto dove può avvenire una menzione
 */
export enum MentionableType {
  POST = 'POST',
  COMMENT = 'COMMENT',
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

/**
 * Riepilogo utente (versione leggera)
 * Utilizzato quando servono solo info base dell'utente
 */
export interface UserSummaryDTO {
  id: number;
  username: string;
  nomeCompleto: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
  classroom: string | null;
}

/**
 * Dati completi profilo utente
 */
export interface UserResponseDTO {
  id: number;
  username: string;
  email: string;
  nomeCompleto: string;
  bio: string | null;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  isActive: boolean;
  lastSeen: string; // ISO 8601 format
  isOnline: boolean;
  classroom: string | null;
}

/**
 * Risposta post (versione feed)
 * Utilizzata nella lista dei post senza i commenti
 */
export interface PostResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Dettaglio completo post
 * Include tutti i commenti - usata nella pagina singolo post
 */
export interface PostDettaglioResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  commenti: CommentResponseDTO[];
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Commento con struttura gerarchica
 * Può contenere risposte (max 2 livelli di profondità)
 */
export interface CommentResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string;
  parentCommentId: number | null; // null se è commento principale
  risposte: CommentResponseDTO[]; // Array di risposte
  createdAt: string; // ISO 8601 format
  updatedAt: string; // ISO 8601 format
}

/**
 * Like su un post o commento
 */
export interface LikeResponseDTO {
  utente: UserSummaryDTO;
  createdAt: string; // ISO 8601 format
}

/**
 * Notifica ricevuta dall'utente
 */
export interface NotificationResponseDTO {
  id: number;
  tipo: NotificationType;
  utenteCheLHaGenerata: UserSummaryDTO;
  contenuto: string;
  actionUrl: string; // URL per navigare al contenuto
  isRead: boolean;
  createdAt: string; // ISO 8601 format
}

/**
 * Menzione ricevuta dall'utente
 */
export interface MentionResponseDTO {
  id: number;
  utenteMenzionante: UserSummaryDTO;
  tipo: MentionableType;
  contenutoId: number; // ID del post o commento
  actionUrl: string;
  anteprimaContenuto: string; // Primi 100 caratteri
  createdAt: string; // ISO 8601 format
}

/**
 * Messaggio diretto tra utenti
 */
export interface MessageResponseDTO {
  id: number;
  mittente: UserSummaryDTO;
  destinatario: UserSummaryDTO;
  contenuto: string;
  imageUrl: string | null;
  isRead: boolean;
  isDeletedBySender: boolean;
  isHiddenByCurrentUser: boolean;
  createdAt: string; // ISO 8601 format
}

/**
 * Conversazione DM con ultimo messaggio
 * Utilizzata nella lista delle conversazioni
 */
export interface ConversationResponseDTO {
  altroUtente: UserSummaryDTO;
  ultimoMessaggio: MessageResponseDTO;
  messaggiNonLetti: number;
  ultimaAttivita: string; // ISO 8601 format
}

/**
 * Risposta login/registrazione
 */
export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  type: string; // "Bearer"
  user: UserResponseDTO;
}

/**
 * Risposta refresh token
 */
export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
  type: string; // "Bearer"
}

/**
 * Risposta errore standardizzata
 */
export interface ErrorResponseDTO {
  timestamp: string; // ISO 8601 format
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>; // Solo per errori di validazione
}

// ============================================================================
// REQUEST INTERFACES
// ============================================================================

/**
 * Richiesta registrazione nuovo utente
 */
export interface RegistrazioneRequestDTO {
  username: string; // Min 3, max 50 caratteri, solo lettere/numeri/_
  email: string; // Email valida
  password: string; // Min 6 caratteri
  nomeCompleto: string; // Max 100 caratteri
  classroom: string; // Classe dello studente (es. 5IA)
}

/**
 * Richiesta login
 */
export interface LoginRequestDTO {
  username: string;
  password: string;
}

/**
 * Richiesta refresh token
 */
export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

/**
 * Richiesta reset password (step 1)
 */
export interface PasswordResetRequestDTO {
  email: string;
}

/**
 * Conferma reset password (step 2)
 */
export interface PasswordResetConfirmDTO {
  token: string;
  newPassword: string; // Min 6 caratteri
}

/**
 * Aggiornamento profilo utente
 * Tutti i campi sono opzionali (partial update)
 */
export interface AggiornaProfiloRequestDTO {
  nomeCompleto?: string; // Max 100 caratteri
  bio?: string; // Max 100 caratteri
  profilePictureUrl?: string; // URL Cloudinary
}

/**
 * Cambio password
 */
export interface CambiaPasswordRequestDTO {
  vecchiaPassword: string;
  nuovaPassword: string; // Min 8 caratteri
}

/**
 * Disattivazione account
 */
export interface DisattivaAccountRequestDTO {
  password: string; // Conferma con password
}

/**
 * Creazione nuovo post
 */
export interface CreaPostRequestDTO {
  contenuto?: string; // Max 5000 caratteri
  imageUrl?: string; // URL Cloudinary dopo upload
}

/**
 * Modifica post esistente
 */
export interface ModificaPostRequestDTO {
  contenuto?: string; // Max 5000 caratteri
}

/**
 * Creazione commento o risposta
 */
export interface CreaCommentoRequestDTO {
  contenuto: string; // Max 2000 caratteri, obbligatorio
  parentCommentId?: number; // null = commento principale, number = risposta
}

/**
 * Invio messaggio diretto
 */
export interface InviaMessaggioRequestDTO {
  destinatarioId: number;
  contenuto?: string; // Max 5000 caratteri (opzionale se c'è imageUrl)
  imageUrl?: string; // URL immagine Cloudinary (opzionale)
}

/**
 * Indicatore di digitazione WebSocket
 */
export interface TypingIndicatorRequestDTO {
  recipientUsername: string;
  isTyping: boolean;
}

/**
 * Messaggio di test WebSocket
 */
export interface WebSocketTestMessageDTO {
  content: string;
  type?: string;
}
/**
 * Interfaccia per le statistiche utente
 * Restituita dall'endpoint /api/users/{userId}/stats
 */
export interface UserStats {
  /** Numero di post pubblicati dall'utente */
  postsCount: number;

  /** Numero di commenti scritti dall'utente */
  commentsCount: number;

  /** Numero di like ricevuti sui propri post */
  likesReceivedCount: number;

  /** Totale interazioni (post + commenti) */
  totalInteractions: number;
}
// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Parametri per paginazione
 */
export interface PaginationParams {
  page: number; // Numero pagina (0-based)
  size: number; // Elementi per pagina
  sort?: string; // Campo ordinamento
}

/**
 * Risposta paginata generica
 */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/**
 * Risposta generica per conteggi
 */
export interface CountResponse {
  unreadCount: number;
}

/**
 * Risposta generica per messaggi
 */
export interface MessageResponse {
  message: string;
}
