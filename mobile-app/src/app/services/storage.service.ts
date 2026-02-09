import { Injectable } from "@angular/core";
import { Storage } from "@ionic/storage-angular";
import { SupabaseService } from "./supabase.service";

export interface AttendanceRecord {
  id: string;
  type: "check-in" | "check-out";
  timestamp: number;
  date: string;
  time: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  faceDescriptor?: number[];
  synced: boolean;
  photoDataUrl?: string;
  confidence?: number;
  // Employee information for manual check-in
  employeeId?: string;
  employeeName?: string;
  employeeDepartment?: string;
  // Auto checkout flag
  isAutoCheckout?: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  employeeId: string;
  faceDescriptor: number[];
  createdAt: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  photoPath?: string;
  status?: "active" | "inactive";
  deactivatedAt?: number;
}

@Injectable({
  providedIn: "root",
})
export class StorageService {
  private _storage: Storage | null = null;

  constructor(private storage: Storage, private supabase: SupabaseService) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
  }

  async saveAttendance(
    record: Omit<AttendanceRecord, "id" | "synced">
  ): Promise<AttendanceRecord> {
    const id = this.generateId();
    const fullRecord: AttendanceRecord = {
      ...record,
      id,
      synced: false,
    };

    const records = await this.getAttendanceRecords();
    records.push(fullRecord);
    await this._storage?.set("attendance_records", records);

    return fullRecord;
  }

  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const records = (await this._storage?.get("attendance_records")) || [];
    return records.sort(
      (a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp
    );
  }

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const today = new Date().toDateString();
    const records = await this.getAttendanceRecords();
    return records.filter(
      (record) => new Date(record.timestamp).toDateString() === today
    );
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    // For backward compatibility, also save to user_profiles array
    const profiles = await this.getAllUsers();
    profiles.push(profile);
    await this._storage?.set("user_profiles", profiles);

    // Keep the single user_profile for compatibility
    await this._storage?.set("user_profile", profile);
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const profile = (await this._storage?.get("user_profile")) || null;
    // Only return active users
    if (profile && profile.status === "inactive") {
      return null;
    }
    return profile;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const profiles = (await this._storage?.get("user_profiles")) || [];
    // Filter out inactive users and sort by creation date
    return profiles
      .filter((user: UserProfile) => user.status !== "inactive")
      .sort((a: UserProfile, b: UserProfile) => b.createdAt - a.createdAt);
  }

  async deactivateUser(userId: string): Promise<void> {
    const profile = await this.getUserProfile();
    if (profile && profile.id === userId) {
      profile.status = "inactive";
      profile.deactivatedAt = Date.now();
      await this._storage?.set("user_profile", profile);
    }
  }

  async reactivateUser(userId: string): Promise<void> {
    const profile = (await this._storage?.get("user_profile")) || null;
    if (profile && profile.id === userId) {
      profile.status = "active";
      delete profile.deactivatedAt;
      await this._storage?.set("user_profile", profile);
    }
  }

  async getUnsyncedRecords(): Promise<AttendanceRecord[]> {
    const records = await this.getAttendanceRecords();
    return records.filter((record) => !record.synced);
  }

  async markAsSynced(recordIds: string[]): Promise<void> {
    const records = await this.getAttendanceRecords();
    records.forEach((record) => {
      if (recordIds.includes(record.id)) {
        record.synced = true;
      }
    });
    await this._storage?.set("attendance_records", records);
  }

  async clearOldRecords(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    const records = await this.getAttendanceRecords();
    const filteredRecords = records.filter(
      (record) => record.timestamp > cutoffDate
    );
    await this._storage?.set("attendance_records", filteredRecords);
  }

  /**
   * Add a complete attendance record (used by auto-checkout)
   */
  async addAttendanceRecord(record: AttendanceRecord): Promise<void> {
    const records = await this.getAttendanceRecords();
    records.push(record);
    await this._storage?.set("attendance_records", records);
  }

  async saveFaceData(faceDataArray: any[]): Promise<void> {
    const existingFaces = (await this._storage?.get("face_data")) || [];
    const updatedFaces = [...existingFaces, ...faceDataArray];
    await this._storage?.set("face_data", updatedFaces);
  }

  async getFaceData(): Promise<any[]> {
    return (await this._storage?.get("face_data")) || [];
  }

  /**
   * Generic get method for any key
   */
  async get<T = any>(key: string): Promise<T | null> {
    return (await this._storage?.get(key)) || null;
  }

  /**
   * Generic set method for any key
   */
  async set(key: string, value: any): Promise<void> {
    await this._storage?.set(key, value);
  }

  /**
   * Generic remove method for any key
   */
  async remove(key: string): Promise<void> {
    await this._storage?.remove(key);
  }

  /**
   * Clear all attendance records
   */
  async clearAllAttendance(): Promise<void> {
    await this._storage?.set("attendance_records", []);
  }

  /**
   * Clear all user profiles
   */
  async clearAllUsers(): Promise<void> {
    await this._storage?.set("user_profiles", []);
    await this._storage?.remove("user_profile"); // Legacy key
  }

  /**
   * Delete a specific user by ID
   */
  async deleteUser(userId: string): Promise<void> {
    const profiles = await this.getAllUsers();
    const filtered = profiles.filter((p) => p.id !== userId);
    await this._storage?.set("user_profiles", filtered);
  }

  /**
   * Reset all data (users, attendance, and face data)
   */
  async resetAllData(): Promise<void> {
    await this.clearAllAttendance();
    await this.clearAllUsers();
    await this._storage?.remove("face_data");
    console.log("All data cleared successfully");
  }

  /**
   * Sync unsynced attendance records to Supabase
   */
  async syncUnsyncedRecords(): Promise<{ synced: number; failed: number }> {
    if (!this.supabase.isOnline()) {
      console.log("⚠️ Offline - skipping sync");
      return { synced: 0, failed: 0 };
    }

    const records = await this.getAttendanceRecords();
    const unsynced = records.filter((r) => !r.synced);

    if (unsynced.length === 0) {
      console.log("✅ No records to sync");
      return { synced: 0, failed: 0 };
    }

    console.log(`🔄 Syncing ${unsynced.length} attendance records...`);

    let syncedCount = 0;
    let failedCount = 0;

    // Get default company ID
    const companyId = await this.supabase.getOrCreateDefaultCompany();

    for (const record of unsynced) {
      const syncData = {
        ...record,
        companyId,
        checkInTime: new Date(record.timestamp).toISOString(),
        checkOutTime:
          record.type === "check-out"
            ? new Date(record.timestamp).toISOString()
            : null,
        checkInLocation: record.location,
        manualName: record.employeeName,
      };

      const result = await this.supabase.syncAttendanceRecord(syncData);

      if (result.success) {
        record.synced = true;
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    // Save updated sync status
    await this._storage?.set("attendance_records", records);

    console.log(
      `✅ Sync complete: ${syncedCount} synced, ${failedCount} failed`
    );
    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Sync all user profiles to Supabase
   */
  async syncUserProfiles(): Promise<{ synced: number; failed: number }> {
    if (!this.supabase.isOnline()) {
      console.log("⚠️ Offline - skipping profile sync");
      return { synced: 0, failed: 0 };
    }

    const profiles = await this.getAllUsers();

    if (profiles.length === 0) {
      console.log("✅ No profiles to sync");
      return { synced: 0, failed: 0 };
    }

    console.log(`🔄 Syncing ${profiles.length} user profiles...`);

    let syncedCount = 0;
    let failedCount = 0;

    // Get default company ID
    const companyId = await this.supabase.getOrCreateDefaultCompany();

    for (const profile of profiles) {
      const syncData = {
        ...profile,
        companyId,
        employeeCode: profile.employeeId || profile.id,
      };

      const result = await this.supabase.syncEmployeeProfile(syncData);

      if (result.success) {
        syncedCount++;
      } else {
        failedCount++;
      }
    }

    console.log(
      `✅ Profile sync complete: ${syncedCount} synced, ${failedCount} failed`
    );
    return { synced: syncedCount, failed: failedCount };
  }

  /**
   * Auto sync when network is available
   */
  async autoSync(): Promise<void> {
    if (!navigator.onLine) {
      return;
    }

    try {
      const isConnected = await this.supabase.checkConnection();
      if (!isConnected) {
        console.log("⚠️ Supabase not reachable");
        return;
      }

      // Sync both attendance and profiles
      await Promise.all([this.syncUnsyncedRecords(), this.syncUserProfiles()]);
    } catch (error) {
      console.error("Auto sync error:", error);
    }
  }

  /**
   * เพิ่มพนักงานทดสอบ (สำหรับ dev/test mode)
   */
  async initTestEmployee(
    name: string,
    photoBase64: string,
    faceDescriptor: number[]
  ): Promise<UserProfile> {
    const users = await this.getAllUsers();
    const nextNumber = (users.length + 1).toString().padStart(4, "0");

    const testUser: UserProfile = {
      id: `test-${Date.now()}`,
      name: name,
      employeeId: `EMP${nextNumber}`,
      faceDescriptor: faceDescriptor,
      photoPath: photoBase64,
      createdAt: Date.now(),
      status: "active",
    };

    await this.saveUserProfile(testUser);
    console.log(
      "[STORAGE] Test employee created:",
      testUser.name,
      testUser.employeeId
    );

    return testUser;
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}
