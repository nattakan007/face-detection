import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { ApiService, ScheduleConfig } from './api.service';

export interface TimeSettings {
  checkInTime: string;
  checkOutTime: string;
  lateTime: string;
  absentTime: string;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private _storage: Storage | null = null;
  private readonly STORAGE_KEY = 'time_settings';
  private _cachedSettings: TimeSettings | null = null;
  private lastFetchTime = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 นาที

  constructor(private storage: Storage, private apiService: ApiService) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
  }

  async getSettings(refreshFromApi: boolean = false): Promise<TimeSettings> {
    const now = Date.now();

    // ถ้าไม่มีใน cache หรือหมดอายุหรือต้องการรับข้อมูลใหม่
    if (!this._cachedSettings || refreshFromApi || (now - this.lastFetchTime) > this.CACHE_DURATION) {
      try {
        // พยายามรับข้อมูลจาก API พร้อม fallback
        const apiSettings = await this.apiService.getScheduleWithFallback();
        this._cachedSettings = apiSettings;
        this.lastFetchTime = now;

        // บันทึกลง local storage
        await this._storage?.set(this.STORAGE_KEY, apiSettings);
      } catch (error) {
        console.error('Error fetching settings from API:', error);

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
      checkInTime: '08:00',
      checkOutTime: '17:00',
      lateTime: '08:30',
      absentTime: '09:00'
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
}