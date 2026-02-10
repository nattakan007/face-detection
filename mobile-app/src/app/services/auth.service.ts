import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";

export interface AuthSession {
  authenticated: boolean;
  expiresAt: number; // timestamp
  companyName?: string; // company profile name
}

/**
 * Company profile for offline-first auth
 * TODO: เมื่อเชื่อมต่อ API server จะ sync company profile จาก database
 * - Link กับ companies table ใน Supabase
 * - ดึง company settings, logo, shifts จาก API
 * - ใช้ companyId เป็น foreign key สำหรับ employees/attendance
 */
export interface CompanyProfile {
  id?: string; // UUID from server (when online)
  name: string; // company/username
  passwordHash: string;
  createdAt: number;
  synced?: boolean; // true เมื่อ sync กับ server แล้ว
  serverId?: string; // company ID จาก API server
}

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private readonly CREDENTIALS_KEY = "admin_credentials";
  private readonly SESSION_KEY = "admin_session";
  private readonly SESSION_DURATION = 30 * 60 * 1000; // 30 minutes
  // Legacy PIN key - for migration
  private readonly LEGACY_PIN_KEY = "admin_pin_hash";

  // Default test credentials
  private readonly DEFAULT_USERNAME = "sailor";
  private readonly DEFAULT_PASSWORD = "admin123";

  constructor(private storage: StorageService) {}

  /**
   * Hash password using SHA-256
   */
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Setup credentials (username + password)
   */
  async setupCredentials(username: string, password: string): Promise<void> {
    if (!username || username.trim().length === 0) {
      throw new Error("กรุณาระบุชื่อผู้ใช้");
    }
    if (!password || password.length < 4) {
      throw new Error("รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร");
    }

    const hash = await this.hashPassword(password);
    const profile: CompanyProfile = {
      name: username.trim().toLowerCase(),
      passwordHash: hash,
      createdAt: Date.now(),
      synced: false,
    };
    await this.storage.set(this.CREDENTIALS_KEY, profile);
  }

  /**
   * Verify username + password and create session
   */
  async verifyCredentials(
    username: string,
    password: string,
  ): Promise<boolean> {
    let stored = await this.storage.get<CompanyProfile>(this.CREDENTIALS_KEY);

    // If no credentials set, create default
    if (!stored) {
      await this.setupCredentials(this.DEFAULT_USERNAME, this.DEFAULT_PASSWORD);
      stored = await this.storage.get<CompanyProfile>(this.CREDENTIALS_KEY);
    }

    if (!stored) return false;

    const inputHash = await this.hashPassword(password);
    const inputName = username.trim().toLowerCase();

    if (inputName === stored.name && inputHash === stored.passwordHash) {
      const session: AuthSession = {
        authenticated: true,
        expiresAt: Date.now() + this.SESSION_DURATION,
        companyName: stored.name,
      };
      await this.storage.set(this.SESSION_KEY, session);
      return true;
    }

    return false;
  }

  /**
   * Legacy: Verify PIN (สำหรับ migration - จะถูกลบในอนาคต)
   */
  async verifyPin(pin: string): Promise<boolean> {
    // ลอง verify แบบ legacy PIN ก่อน
    const storedHash = await this.storage.get(this.LEGACY_PIN_KEY);
    if (storedHash) {
      const inputHash = await this.hashPassword(pin);
      if (inputHash === storedHash) {
        const session: AuthSession = {
          authenticated: true,
          expiresAt: Date.now() + this.SESSION_DURATION,
        };
        await this.storage.set(this.SESSION_KEY, session);
        return true;
      }
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
   * Change credentials (requires old password verification)
   */
  async changeCredentials(
    oldPassword: string,
    newUsername: string,
    newPassword: string,
  ): Promise<boolean> {
    const stored = await this.storage.get<CompanyProfile>(this.CREDENTIALS_KEY);
    if (!stored) return false;

    const oldHash = await this.hashPassword(oldPassword);
    if (oldHash !== stored.passwordHash) return false;

    await this.setupCredentials(newUsername, newPassword);
    return true;
  }

  /**
   * Logout - clear session
   */
  async logout(): Promise<void> {
    await this.storage.remove(this.SESSION_KEY);
  }

  /**
   * Check if credentials have been set up
   */
  async hasCredentialsSetup(): Promise<boolean> {
    const creds = await this.storage.get(this.CREDENTIALS_KEY);
    return !!creds;
  }

  /**
   * Get company profile name
   */
  async getCompanyName(): Promise<string> {
    const stored = await this.storage.get<CompanyProfile>(this.CREDENTIALS_KEY);
    return stored?.name || "";
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
    return Math.max(0, Math.ceil(remaining / 60000));
  }

  /**
   * Legacy: Setup PIN (backward compatibility)
   */
  async setupPin(pin: string): Promise<void> {
    const hash = await this.hashPassword(pin);
    await this.storage.set(this.LEGACY_PIN_KEY, hash);
  }

  /**
   * Legacy: Change PIN
   */
  async changePin(oldPin: string, newPin: string): Promise<boolean> {
    const isValid = await this.verifyPin(oldPin);
    if (!isValid) return false;
    await this.setupPin(newPin);
    return true;
  }

  /**
   * Legacy: hasPinSetup
   */
  async hasPinSetup(): Promise<boolean> {
    const hash = await this.storage.get(this.LEGACY_PIN_KEY);
    return !!hash;
  }
}
