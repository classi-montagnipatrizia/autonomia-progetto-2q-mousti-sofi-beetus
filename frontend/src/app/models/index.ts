// ============================================================================
// ENUMS
// ============================================================================

export enum NotificationType {
  MENTION = 'MENTION',
  COMMENT = 'COMMENT',
  LIKE = 'LIKE',
  DIRECT_MESSAGE = 'DIRECT_MESSAGE',
  NEW_POST = 'NEW_POST',
  BOOK_MESSAGE = 'BOOK_MESSAGE',   // Nuovo messaggio nella chat libreria
  GROUP_MESSAGE = 'GROUP_MESSAGE', // Nuovo messaggio in un gruppo
  GROUP_INVITE = 'GROUP_INVITE',   // Aggiunto a un gruppo
}

export enum BookCondition {
  OTTIMO = 'OTTIMO',
  BUONO = 'BUONO',
  ACCETTABILE = 'ACCETTABILE',
}

export enum BookStatus {
  DISPONIBILE = 'DISPONIBILE',
  VENDUTO = 'VENDUTO',
}

export enum MentionableType {
  POST = 'POST',
  COMMENT = 'COMMENT',
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

export interface UserSummaryDTO {
  id: number;
  username: string;
  nomeCompleto: string;
  profilePictureUrl: string | null;
  isOnline: boolean;
  classroom: string | null;
}

export interface UserResponseDTO {
  id: number;
  username: string;
  email: string;
  nomeCompleto: string;
  bio: string | null;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  isActive: boolean;
  lastSeen: string;
  isOnline: boolean;
  classroom: string | null;
}

export interface PostResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PostDettaglioResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string | null;
  imageUrl: string | null;
  likesCount: number;
  commentsCount: number;
  hasLiked: boolean;
  commenti: CommentResponseDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface CommentResponseDTO {
  id: number;
  autore: UserSummaryDTO;
  contenuto: string;
  parentCommentId: number | null;
  risposte: CommentResponseDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface LikeResponseDTO {
  utente: UserSummaryDTO;
  createdAt: string;
}

export interface NotificationResponseDTO {
  id: number;
  tipo: NotificationType;
  utenteCheLHaGenerata: UserSummaryDTO;
  contenuto: string;
  actionUrl: string;
  isRead: boolean;
  createdAt: string;
}

export interface MentionResponseDTO {
  id: number;
  utenteMenzionante: UserSummaryDTO;
  tipo: MentionableType;
  contenutoId: number;
  actionUrl: string;
  anteprimaContenuto: string;
  createdAt: string;
}

export interface MessageResponseDTO {
  id: number;
  mittente: UserSummaryDTO;
  destinatario: UserSummaryDTO;
  contenuto: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  isRead: boolean;
  isDeletedBySender: boolean;
  isHiddenByCurrentUser: boolean;
  createdAt: string;
}

export interface ConversationResponseDTO {
  altroUtente: UserSummaryDTO;
  ultimoMessaggio: MessageResponseDTO;
  messaggiNonLetti: number;
  ultimaAttivita: string;
}

export interface LoginResponseDTO {
  accessToken: string;
  refreshToken: string;
  type: string;
  user: UserResponseDTO;
}

export interface RefreshTokenResponseDTO {
  accessToken: string;
  refreshToken: string;
  type: string;
}

export interface ErrorResponseDTO {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}

// ============================================================================
// BOOK DTOs
// ============================================================================

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
  createdAt: string;
  updatedAt: string;
}

/**
 * Conversazione venditore-acquirente per un libro.
 * Il backend restituisce sempre la prospettiva dell'utente corrente tramite `altroUtente`.
 */
export interface BookConversationDTO {
  id: number;
  libro: BookSummaryDTO;
  altroUtente: UserSummaryDTO;
  ultimoMessaggio: BookMessageDTO | null;
  messaggiNonLetti: number;
  ultimaAttivita: string | null;
  createdAt: string;
}

export interface BookMessageDTO {
  id: number;
  conversationId: number;
  mittente: UserSummaryDTO;
  contenuto: string;
  isRead: boolean;
  isDeletedBySender: boolean;
  createdAt: string;
}

// ============================================================================
// AI DTOs
// ============================================================================

export interface AnalizzaLibroResponseDTO {
  titolo: string | null;
  autore: string | null;
  isbn: string | null;
  materia: string | null;
  annoScolastico: string | null;
  prezzo: number | null;
  descrizione: string | null;
  condizione: BookCondition | null;
}

export interface ChatbotResponseDTO {
  risposta: string;
  libri: BookSummaryDTO[];
}

// ============================================================================
// GROUP DTOs
// ============================================================================

export interface GroupMemberDTO {
  id: number;
  username: string;
  fullName: string;
  profilePictureUrl: string | null;
  isAdmin: boolean;
  joinedAt: string;
}

export interface GroupMessageDTO {
  id: number;
  groupId: number;
  senderId: number;
  senderUsername: string;
  senderFullName: string;
  senderProfilePictureUrl: string | null;
  content: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  audioDuration: number | null;
  isDeletedBySender: boolean;
  createdAt: string;
}

export interface GroupTypingEvent {
  senderId: number;
  senderUsername: string;
  isTyping: boolean;
}

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
// REQUEST DTOs
// ============================================================================

export interface RegistrazioneRequestDTO {
  username: string;
  email: string;
  password: string;
  nomeCompleto: string;
  classroom: string;
}

export interface LoginRequestDTO {
  username: string;
  password: string;
}

export interface RefreshTokenRequestDTO {
  refreshToken: string;
}

export interface PasswordResetRequestDTO {
  email: string;
}

export interface PasswordResetConfirmDTO {
  token: string;
  newPassword: string;
}

export interface AggiornaProfiloRequestDTO {
  nomeCompleto?: string;
  bio?: string;
  profilePictureUrl?: string;
}

export interface CambiaPasswordRequestDTO {
  vecchiaPassword: string;
  nuovaPassword: string;
}

export interface DisattivaAccountRequestDTO {
  password: string;
}

export interface CreaPostRequestDTO {
  contenuto?: string;
  imageUrl?: string;
}

export interface ModificaPostRequestDTO {
  contenuto?: string;
}

export interface CreaCommentoRequestDTO {
  contenuto: string;
  parentCommentId?: number;
}

export interface InviaMessaggioRequestDTO {
  destinatarioId: number;
  contenuto?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface CreaLibroRequestDTO {
  titolo: string;
  autore: string;
  isbn?: string;
  descrizione?: string;
  prezzo: number;
  condizione: BookCondition;
  annoScolastico: string;
  materia: string;
  frontImageUrl: string;
  backImageUrl?: string;
}

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

export interface CreaGruppoRequestDTO {
  nome: string;
  descrizione?: string;
  profilePictureUrl?: string;
}

export interface ModificaGruppoRequestDTO {
  nome?: string;
  descrizione?: string;
  profilePictureUrl?: string;
}

export interface InviaMessaggioGruppoRequestDTO {
  contenuto?: string;
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface TypingIndicatorRequestDTO {
  recipientUsername: string;
  isTyping: boolean;
}

export interface WebSocketTestMessageDTO {
  content: string;
  type?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface UserStats {
  postsCount: number;
  commentsCount: number;
  likesReceivedCount: number;
  totalInteractions: number;
}

export interface PaginationParams {
  page: number;
  size: number;
  sort?: string;
}

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

export interface CountResponse {
  unreadCount: number;
}

export interface MessageResponse {
  message: string;
}
