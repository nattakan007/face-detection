import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage-angular";
import { ApiService, ScheduleConfig } from "./api.service";
import {
  AppSettings,
  AppSettingsDefaults,
  AppSettingsValidator,
} from "../models/app-settings.model";

export interface TimeSettings {
  checkInTime: string;
  checkOutTime: string;
  lateTime: string;
  absentTime: string;
}

@Injectable({
  providedIn: "root",
})
export class SettingsService {
  private _storage: Storage | null = null;
  private readonly STORAGE_KEY = "time_settings";
  private readonly APP_SETTINGS_KEY = "app_settings";
  private _cachedSettings: TimeSettings | null = null;
  private _cachedAppSettings: AppSettings | null = null;
  private lastFetchTime = 0;
  private lastAppSettingsFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

  constructor(private storage: Storage, private apiService: ApiService) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;

    // Initialize app settings if not exists
    await this.initializeAppSettings();
  }

  /**
   * Initialize app settings with defaults if not exists
   * Also migrate outdated settings values
   */
  private async initializeAppSettings(): Promise<void> {
    const existingSettings = await this._storage?.get(this.APP_SETTINGS_KEY);
    if (!existingSettings) {
      const defaults = AppSettingsDefaults.getDefaults();
      await this._storage?.set(this.APP_SETTINGS_KEY, defaults);
      this._cachedAppSettings = defaults;
    } else {
      // Migrate: fix any outdated autoCaptureThresholdScan values
      const defaults = AppSettingsDefaults.getDefaults();
      let needsSave = false;

      if (existingSettings.faceDetection) {
        // Fix: old default was 0.98 which is too strict for mobile
        if (existingSettings.faceDetection.autoCaptureThresholdScan > 0.9) {
          existingSettings.faceDetection.autoCaptureThresholdScan =
            defaults.faceDetection.autoCaptureThresholdScan;
          needsSave = true;
        }
        // Ensure autoCaptureCooldown is reasonable
        if (existingSettings.faceDetection.autoCaptureCooldown > 2000) {
          existingSettings.faceDetection.autoCaptureCooldown =
            defaults.faceDetection.autoCaptureCooldown;
          needsSave = true;
        }
        // Migrate: TinyFaceDetector gives lower scores than SSD
        // Reset any confidence thresholds that are too high for TinyFaceDetector (> 80%)
        if (existingSettings.faceDetection.minConfidence > 0.8) {
          existingSettings.faceDetection.minConfidence =
            defaults.faceDetection.minConfidence;
          needsSave = true;
        }
        if (existingSettings.faceDetection.registrationMinConfidence > 0.8) {
          existingSettings.faceDetection.registrationMinConfidence =
            defaults.faceDetection.registrationMinConfidence;
          needsSave = true;
        }
        if (existingSettings.faceDetection.autoCaptureThresholdScan > 0.8) {
          existingSettings.faceDetection.autoCaptureThresholdScan =
            defaults.faceDetection.autoCaptureThresholdScan;
          needsSave = true;
        }
        if (existingSettings.faceDetection.minSimilarityPercent > 0.6) {
          existingSettings.faceDetection.minSimilarityPercent =
            defaults.faceDetection.minSimilarityPercent;
          needsSave = true;
        }
      }

      // Migrate: ensure autoCheckoutEnabled defaults to true
      if (
        existingSettings.attendance &&
        existingSettings.attendance.autoCheckoutEnabled === false &&
        existingSettings.attendance.autoCheckoutHours === 8
      ) {
        existingSettings.attendance.autoCheckoutEnabled = true;
        needsSave = true;
      }

      if (needsSave) {
        console.log("[SETTINGS] Migrating outdated settings to new defaults");
        await this._storage?.set(this.APP_SETTINGS_KEY, existingSettings);
      }
      this._cachedAppSettings = existingSettings;
    }
  }

  async getSettings(refreshFromApi: boolean = false): Promise<TimeSettings> {
    const now = Date.now();

    // ถ้าไม่มีใน cache หรือหมดอายุหรือต้องการรับข้อมูลใหม่
    if (
      !this._cachedSettings ||
      refreshFromApi ||
      now - this.lastFetchTime > this.CACHE_DURATION
    ) {
      try {
        // พยายามรับข้อมูลจาก API พร้อม fallback
        const apiSettings = await this.apiService.getScheduleWithFallback();
        this._cachedSettings = apiSettings;
        this.lastFetchTime = now;

        // บันทึกลง local storage
        await this._storage?.set(this.STORAGE_KEY, apiSettings);
      } catch (error) {
        console.error("Error fetching settings from API:", error);

        // ถ้า API ล้มเหลว ใช้ค่าจาก local storage
        const localSettings = await this._storage?.get(this.STORAGE_KEY);
        if (localSettings) {
          this._cachedSettings = localSettings;
        } else {
          // ถ้าไม่มีใน local storage ใช้ค่าเริ่มต้น (offline fallback)
          this._cachedSettings = await this.getDefaultSettings();
        }
      }
    }

    // ตรวจสอบว่า _cachedSettings ไม่เป็น null
    if (!this._cachedSettings) {
      this._cachedSettings = await this.getDefaultSettings();
    }

    return this._cachedSettings;
  }

  async getDefaultSettings(): Promise<TimeSettings> {
    return {
      checkInTime: "08:00",
      checkOutTime: "17:00",
      lateTime: "08:30",
      absentTime: "09:00",
    };
  }

  async saveSettings(settings: TimeSettings): Promise<void> {
    this._cachedSettings = settings;
    this.lastFetchTime = Date.now();
    await this._storage?.set(this.STORAGE_KEY, settings);
  }

  async isLate(checkInTime: string): Promise<boolean> {
    const settings = await this.getSettings();
    return checkInTime > settings.lateTime;
  }

  async isAbsent(checkInTime: string): Promise<boolean> {
    const settings = await this.getSettings();
    return checkInTime > settings.absentTime;
  }

  // ฟังก์ชันสำหรับบังคับรีเฟรชข้อมูลจาก API
  async refreshFromApi(): Promise<void> {
    await this.getSettings(true);
  }

  // ตรวจสอบว่าข้อมูลเป็นแบบ offline mode หรือไม่
  async isOfflineMode(): Promise<boolean> {
    try {
      const apiSettings = await this.apiService.getScheduleWithFallback();
      const defaultSettings = await this.getDefaultSettings();

      // ถ้าค่าตรงกับค่าเริ่มต้น แสดงว่าเป็น offline mode
      return JSON.stringify(apiSettings) === JSON.stringify(defaultSettings);
    } catch (error) {
      return true;
    }
  }

  // ==================== NEW APP SETTINGS METHODS ====================

  /**
   * Get complete app settings
   */
  async getAppSettings(): Promise<AppSettings> {
    const now = Date.now();

    // Use cache if available and not expired
    if (
      this._cachedAppSettings &&
      now - this.lastAppSettingsFetchTime < this.CACHE_DURATION
    ) {
      return this._cachedAppSettings;
    }

    // Load from storage
    const settings = await this._storage?.get(this.APP_SETTINGS_KEY);

    if (settings) {
      this._cachedAppSettings = settings;
      this.lastAppSettingsFetchTime = now;
      return settings;
    }

    // Return defaults if nothing in storage
    const defaults = AppSettingsDefaults.getDefaults();
    await this._storage?.set(this.APP_SETTINGS_KEY, defaults);
    this._cachedAppSettings = defaults;
    this.lastAppSettingsFetchTime = now;
    return defaults;
  }

  /**
   * Update app settings
   */
  async updateAppSettings(
    settings: AppSettings,
  ): Promise<{ success: boolean; errors?: string[] }> {
    // Validate settings
    const validation = AppSettingsValidator.validateSettings(settings);

    if (!validation.valid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Update timestamp
    settings.lastUpdated = Date.now();

    // Save to storage
    await this._storage?.set(this.APP_SETTINGS_KEY, settings);

    // Update cache
    this._cachedAppSettings = settings;
    this.lastAppSettingsFetchTime = Date.now();

    return { success: true };
  }

  /**
   * Reset to default settings
   */
  async resetToDefaults(): Promise<void> {
    const defaults = AppSettingsDefaults.getDefaults();
    await this._storage?.set(this.APP_SETTINGS_KEY, defaults);
    this._cachedAppSettings = defaults;
    this.lastAppSettingsFetchTime = Date.now();
  }

  /**
   * Load preset (strict, balanced, lenient)
   */
  async loadPreset(preset: "strict" | "balanced" | "lenient"): Promise<void> {
    let settings: AppSettings;

    switch (preset) {
      case "strict":
        settings = AppSettingsDefaults.getStrictPreset();
        break;
      case "lenient":
        settings = AppSettingsDefaults.getLenientPreset();
        break;
      default:
        settings = AppSettingsDefaults.getDefaults();
    }

    await this.updateAppSettings(settings);
  }

  /**
   * Export settings as JSON
   */
  async exportSettings(): Promise<string> {
    const settings = await this.getAppSettings();
    return JSON.stringify(settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  async importSettings(
    jsonString: string,
  ): Promise<{ success: boolean; errors?: string[] }> {
    try {
      const settings: AppSettings = JSON.parse(jsonString);
      return await this.updateAppSettings(settings);
    } catch (error) {
      return {
        success: false,
        errors: ["รูปแบบ JSON ไม่ถูกต้อง"],
      };
    }
  }

  /**
   * Get specific setting group
   */
  async getFaceDetectionSettings() {
    const settings = await this.getAppSettings();
    return settings.faceDetection;
  }

  async getScheduleSettings() {
    const settings = await this.getAppSettings();
    return settings.schedule;
  }

  async getAttendanceSettings() {
    const settings = await this.getAppSettings();
    return settings.attendance;
  }

  async getWorkShifts() {
    const settings = await this.getAppSettings();
    return settings.workShifts;
  }

  async getCameraSettings() {
    const settings = await this.getAppSettings();
    return settings.camera;
  }
}
