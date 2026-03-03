// ============================================================================
// ENUMS
// ============================================================================

/**
 * Tipo di notifica
 */
export enum NotificationType {
  MENTION = 'MENTION',
  COMMENT = 'COMMENT',
  LIKE = 'LIKE',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  NEW_POST = 'NEW_POST',
  BOOK_REQUEST = 'BOOK_REQUEST',   // Qualcuno ha richiesto un tuo libro
  BOOK_MESSAGE = 'BOOK_MESSAGE',   // Nuovo messaggio nella chat libreria
  GROUP_MESSAGE = 'GROUP_MESSAGE', // Nuovo messaggio in un gruppo
}

/**
 * Condizione fisica del libro
 */
export enum BookCondition {
  COME_NUOVO = 'OTTIMO',
  BUONE_CONDIZIONI = 'BUONO',
  USATO = 'USATO',
}

/**
 * Stato disponibilità del libro
 */
export enum BookStatus {
  DISPONIBILE = 'DISPONIBILE',
  RICHIESTO = 'RICHIESTO',
  VENDUTO = 'VENDUTO',
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
  contenuto: string | null;
  imageUrl: string | null;
  audioUrl: string | null;       // presente solo per messaggi vocali
  audioDuration: number | null;  // durata in secondi
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
// BOOK DTOs
// ============================================================================

/**
 * Riepilogo libro (versione card/griglia)
 */
export interface BookSummaryDTO {
  id: number;
  titolo: string;
  autore: string;
  prezzo: number;
  condizione: BookCondition;
  stato: BookStatus;
  annoScolastico: string | null;
  materia: string | null;
  frontImageUrl: string;
  venditore: UserSummaryDTO;
  createdAt: string;
}

/**
 * Dettaglio completo libro
 */
export interface BookResponseDTO {
  id: number;
  titolo: string;
  autore: string;
  isbn: string | null;
  descrizione: string | null;
  prezzo: number;
  condizione: BookCondition;
  stato: BookStatus;
  annoScolastico: string | null;
  materia: string | null;
  frontImageUrl: string;
  backImageUrl: string | null;
  venditore: UserSummaryDTO;
  richiedente: UserSummaryDTO | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversazione venditore-acquirente per un libro
 */
export interface BookConversationDTO {
  id: number;
  book: BookSummaryDTO;
  seller: UserSummaryDTO;
  buyer: UserSummaryDTO;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

/**
 * Messaggio nella chat venditore-acquirente
 */
export interface BookMessageDTO {
  id: number;
  conversationId: number;
  sender: UserSummaryDTO;
  contenuto: string;
  isRead: boolean;
  createdAt: string;
}

// ============================================================================
// AI DTOs
// ============================================================================

/**
 * Risposta analisi libro da Gemini Vision
 */
export interface AnalizzaLibroResponseDTO {
  titolo: string | null;
  autore: string | null;
  isbn: string | null;
  materia: string | null;
  annoScolastico: string | null;
  prezzoSuggerito: number | null;
  descrizione: string | null;
  condizione: BookCondition | null;
}

/**
 * Risposta chatbot Gemini
 */
export interface ChatbotResponseDTO {
  risposta: string;
  libri: BookSummaryDTO[];
}

// ============================================================================
// GROUP DTOs
// ============================================================================

/**
 * Membro di un gruppo
 */
export interface GroupMemberDTO {
  id: number;
  username: string;
  fullName: string;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

/**
 * Messaggio in un gruppo
 */
export interface GroupMessageDTO {
  id: number;
  groupId: number;
  senderId: number;
  senderUsername: string;
  senderFullName: string;
  senderProfilePictureUrl: string | null;
  content: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  createdAt: string;
}

/**
 * Riepilogo gruppo (lista "I miei gruppi")
 */
export interface GroupSummaryDTO {
  id: number;
  name: string;
  description: string | null;
  profilePictureUrl: string | null;
  memberCount: number;
  unreadCount: number;
  lastMessageContent: string | null;
  lastMessageAt: string | null;
  isAdmin: boolean;
}

/**
 * Dettaglio gruppo con lista membri
 */
export interface GroupResponseDTO {
  id: number;
  name: string;
  description: string | null;
  profilePictureUrl: string | null;
  adminId: number;
  adminUsername: string;
  memberCount: number;
  members: GroupMemberDTO[];
  createdAt: string;
  isAdmin: boolean;
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
  contenuto?: string;      // Max 5000 caratteri (opzionale se c'è imageUrl)
  imageUrl?: string;       // URL immagine Cloudinary (opzionale, compatibile con testo)
  audioUrl?: string;       // URL audio Cloudinary (esclusivo: no testo/immagine)
  audioDuration?: number;  // Durata in secondi, obbligatorio con audioUrl, max 120
}

/**
 * Creazione annuncio libro
 */
export interface CreaLibroRequestDTO {
  titolo: string;
  autore: string;
  isbn?: string;
  descrizione?: string;
  prezzo: number;
  condizione: BookCondition;
  annoScolastico?: string;
  materia?: string;
  frontImageUrl: string;
  backImageUrl?: string;
}

/**
 * Modifica annuncio libro (campi opzionali)
 */
export interface ModificaLibroRequestDTO {
  titolo?: string;
  autore?: string;
  isbn?: string;
  descrizione?: string;
  prezzo?: number;
  condizione?: BookCondition;
  annoScolastico?: string;
  materia?: string;
  frontImageUrl?: string;
  backImageUrl?: string;
}

/**
 * Creazione gruppo
 */
export interface CreaGruppoRequestDTO {
  nome: string;           // Max 100 caratteri
  descrizione?: string;  // Max 500 caratteri
  profilePictureUrl?: string;
}

/**
 * Modifica gruppo (solo admin)
 */
export interface ModificaGruppoRequestDTO {
  nome?: string;
  descrizione?: string;
  profilePictureUrl?: string;
}

/**
 * Invio messaggio in un gruppo
 */
export interface InviaMessaggioGruppoRequestDTO {
  contenuto?: string;      // Max 2000 caratteri (opzionale se c'è audioUrl)
  audioUrl?: string;       // URL audio Cloudinary (esclusivo: no testo)
  audioDuration?: number;  // Durata in secondi, obbligatorio con audioUrl, max 120
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
