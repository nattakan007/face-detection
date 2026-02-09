import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";

export interface AuthSession {
  authenticated: boolean;
  expiresAt: number; // timestamp
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly PIN_KEY = "admin_pin_hash";
  private readonly SESSION_KEY = "admin_session";
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes in milliseconds
  private readonly DEFAULT_PIN = "000000";

  constructor(private storage: StorageService) {}

  /**
   * Hash PIN using SHA-256
   */
  private async hashPin(pin: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Setup or reset PIN
   */
  async setupPin(pin: string): Promise<void> {
    if (pin.length < 4 || pin.length > 6) {
      throw new Error("PIN must be 4-6 digits");
    }
    if (!/^\d+$/.test(pin)) {
      throw new Error("PIN must contain only numbers");
    }

    const hash = await this.hashPin(pin);
    await this.storage.set(this.PIN_KEY, hash);
  }

  /**
   * Verify PIN and create session if correct
   */
  async verifyPin(pin: string): Promise<boolean> {
    const storedHash = await this.storage.get(this.PIN_KEY);

    // If no PIN is set, use default PIN
    if (!storedHash) {
      await this.setupPin(this.DEFAULT_PIN);
      return this.verifyPin(pin);
    }

    const inputHash = await this.hashPin(pin);

    if (inputHash === storedHash) {
      // Create session
      const session: AuthSession = {
        authenticated: true,
        expiresAt: Date.now() + this.SESSION_DURATION,
      };
      await this.storage.set(this.SESSION_KEY, session);
      return true;
    }

    return false;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.storage.get<AuthSession>(this.SESSION_KEY);

    if (!session || !session.authenticated) {
      return false;
    }

    // Check if session has expired
    if (Date.now() > session.expiresAt) {
      await this.logout();
      return false;
    }

    return true;
  }

  /**
   * Extend session by another 30 minutes
   */
  async extendSession(): Promise<void> {
    const isAuth = await this.isAuthenticated();
    if (isAuth) {
      const session: AuthSession = {
        authenticated: true,
        expiresAt: Date.now() + this.SESSION_DURATION,
      };
      await this.storage.set(this.SESSION_KEY, session);
    }
  }

  /**
   * Change PIN (requires old PIN verification)
   */
  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(oldPin);

    if (!isValid) {
      return false;
    }

    await this.setupPin(newPin);
    return true;
  }

  /**
   * Logout - clear session but keep PIN
   */
  async logout(): Promise<void> {
    await this.storage.remove(this.SESSION_KEY);
  }

  /**
   * Check if PIN has been set up
   */
  async hasPinSetup(): Promise<boolean> {
    const hash = await this.storage.get(this.PIN_KEY);
    return !!hash;
  }

  /**
   * Get remaining session time in minutes
   */
  async getSessionTimeRemaining(): Promise<number> {
    const session = await this.storage.get<AuthSession>(this.SESSION_KEY);

    if (!session || !session.authenticated) {
      return 0;
    }

    const remaining = session.expiresAt - Date.now();
    return Math.max(0, Math.ceil(remaining / 60000)); // Convert to minutes
  }
}
