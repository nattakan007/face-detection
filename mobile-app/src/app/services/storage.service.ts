import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';

export interface AttendanceRecord {
  id: string;
  type: 'check-in' | 'check-out';
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
  status?: 'active' | 'inactive';
  deactivatedAt?: number;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private _storage: Storage | null = null;

  constructor(private storage: Storage) {
    this.init();
  }

  async init() {
    const storage = await this.storage.create();
    this._storage = storage;
  }

  async saveAttendance(record: Omit<AttendanceRecord, 'id' | 'synced'>): Promise<AttendanceRecord> {
    const id = this.generateId();
    const fullRecord: AttendanceRecord = {
      ...record,
      id,
      synced: false
    };

    const records = await this.getAttendanceRecords();
    records.push(fullRecord);
    await this._storage?.set('attendance_records', records);

    return fullRecord;
  }

  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    const records = await this._storage?.get('attendance_records') || [];
    return records.sort((a: AttendanceRecord, b: AttendanceRecord) => b.timestamp - a.timestamp);
  }

  async getTodayAttendance(): Promise<AttendanceRecord[]> {
    const today = new Date().toDateString();
    const records = await this.getAttendanceRecords();
    return records.filter(record => new Date(record.timestamp).toDateString() === today);
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    // For backward compatibility, also save to user_profiles array
    const profiles = await this.getAllUsers();
    profiles.push(profile);
    await this._storage?.set('user_profiles', profiles);

    // Keep the single user_profile for compatibility
    await this._storage?.set('user_profile', profile);
  }

  async getUserProfile(): Promise<UserProfile | null> {
    const profile = await this._storage?.get('user_profile') || null;
    // Only return active users
    if (profile && profile.status === 'inactive') {
      return null;
    }
    return profile;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    const profiles = await this._storage?.get('user_profiles') || [];
    // Filter out inactive users and sort by creation date
    return profiles
      .filter((user: UserProfile) => user.status !== 'inactive')
      .sort((a: UserProfile, b: UserProfile) => b.createdAt - a.createdAt);
  }

  async deactivateUser(userId: string): Promise<void> {
    const profile = await this.getUserProfile();
    if (profile && profile.id === userId) {
      profile.status = 'inactive';
      profile.deactivatedAt = Date.now();
      await this._storage?.set('user_profile', profile);
    }
  }

  async reactivateUser(userId: string): Promise<void> {
    const profile = await this._storage?.get('user_profile') || null;
    if (profile && profile.id === userId) {
      profile.status = 'active';
      delete profile.deactivatedAt;
      await this._storage?.set('user_profile', profile);
    }
  }

  async getUnsyncedRecords(): Promise<AttendanceRecord[]> {
    const records = await this.getAttendanceRecords();
    return records.filter(record => !record.synced);
  }

  async markAsSynced(recordIds: string[]): Promise<void> {
    const records = await this.getAttendanceRecords();
    records.forEach(record => {
      if (recordIds.includes(record.id)) {
        record.synced = true;
      }
    });
    await this._storage?.set('attendance_records', records);
  }

  async clearOldRecords(daysToKeep: number = 30): Promise<void> {
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);
    const records = await this.getAttendanceRecords();
    const filteredRecords = records.filter(record => record.timestamp > cutoffDate);
    await this._storage?.set('attendance_records', filteredRecords);
  }

  async saveFaceData(faceDataArray: any[]): Promise<void> {
    const existingFaces = await this._storage?.get('face_data') || [];
    const updatedFaces = [...existingFaces, ...faceDataArray];
    await this._storage?.set('face_data', updatedFaces);
  }

  async getFaceData(): Promise<any[]> {
    return await this._storage?.get('face_data') || [];
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }
}