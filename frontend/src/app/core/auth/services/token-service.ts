import { Injectable, inject } from '@angular/core';
import { UserResponseDTO } from '../../../models';
import { LoggerService } from '../../services/logger.service';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private readonly logger = inject(LoggerService);
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  /**
   * Salva i token nel localStorage
   */
  saveTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
  }

  /**
   * Ottiene l'access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  /**
   * Ottiene il refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Rimuove tutti i token (logout)
   */
  clearTokens(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Decodifica il JWT e estrae le informazioni dell'utente
   */
  getUserFromToken(): UserResponseDTO | null {
    const token = this.getAccessToken();
    
    if (!token) {
      return null;
    }

    try {
      // Il JWT è composto da: header.payload.signature
      const payload = token.split('.')[1];
      
      if (!payload) {
        return null;
      }

      // Decodifica Base64URL
      const decodedPayload = this.base64UrlDecode(payload);
      const data = JSON.parse(decodedPayload);

      // Verifica se il token è scaduto
      if (data.exp && Date.now() >= data.exp * 1000) {
        return null;
      }

      // Estrae i dati utente dal payload
      return {
        id: data.userId,
        username: data.sub, // "subject" del JWT è l'username
        email: data.email,
        nomeCompleto: data.nomeCompleto,
        bio: data.bio || null,
        profilePictureUrl: data.profilePictureUrl || null,
        isAdmin: data.isAdmin || false,
        isActive: data.isActive !== false,
        lastSeen: data.lastSeen || new Date().toISOString(),
        isOnline: true, // Assume online se ha token valido
      } as UserResponseDTO;

    } catch (error) {
      this.logger.error('Errore nella decodifica del token', error);
      return null;
    }
  }

  /**
   * Verifica se il token è valido (non scaduto)
   */
  isTokenValid(): boolean {
    const token = this.getAccessToken();
    
    if (!token) {
      return false;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = this.base64UrlDecode(payload);
      const data = JSON.parse(decodedPayload);

      // Verifica scadenza
      if (data.exp) {
        return Date.now() < data.exp * 1000;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Ottiene il tempo rimanente prima della scadenza del token (in secondi)
   */
  getTokenExpirationTime(): number | null {
    const token = this.getAccessToken();
    
    if (!token) {
      return null;
    }

    try {
      const payload = token.split('.')[1];
      const decodedPayload = this.base64UrlDecode(payload);
      const data = JSON.parse(decodedPayload);

      if (data.exp) {
        const expirationMs = data.exp * 1000;
        const remainingMs = expirationMs - Date.now();
        return Math.floor(remainingMs / 1000);
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Decodifica una stringa Base64URL
   */
  private base64UrlDecode(str: string): string {
    // Sostituisce caratteri Base64URL con Base64 standard
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    
    // Aggiunge padding se necessario
    const pad = base64.length % 4;
    if (pad) {
      if (pad === 1) {
        throw new Error('Invalid Base64URL string');
      }
      base64 += '='.repeat(4 - pad);
    }

    // Decodifica Base64
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
  }
  
}
