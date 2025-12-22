import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, of, throwError } from "rxjs";
import { catchError, map, timeout } from "rxjs/operators";

export interface ScheduleConfig {
  checkInTime: string;
  checkOutTime: string;
  lateTime: string;
  absentTime: string;
}

@Injectable({
  providedIn: "root",
})
export class ApiService {
  private apiUrl = "https://your-api-server.com/api"; // เปลี่ยนเป็น URL ของ API server จริง

  constructor(private http: HttpClient) {}

  async checkNetworkStatus(): Promise<boolean> {
    // Simple network check using navigator.onLine
    if (typeof navigator !== "undefined") {
      return navigator.onLine;
    }
    // Fallback to true (assume online)
    return true;
  }

  getScheduleSettings(): Observable<ScheduleConfig> {
    return this.http.get<ScheduleConfig>(`${this.apiUrl}/schedule`).pipe(
      timeout(5000), // 5 second timeout
      catchError((error) => {
        // ไม่ต้อง log error เพราะเป็นเรื่องปกติในโหมด offline-first
        return throwError(error);
      })
    );
  }

  async getScheduleWithFallback(): Promise<ScheduleConfig> {
    const isConnected = await this.checkNetworkStatus();

    if (isConnected) {
      try {
        const schedule = await this.getScheduleSettings().toPromise();
        if (schedule) {
          // บันทึกข้อมูลที่ได้จาก API ไว้ใน local storage
          this.saveScheduleToLocal(schedule);
          return schedule;
        }
      } catch (error) {
        // ทำงานแบบ offline-first: ใช้ค่า default โดยไม่ต้อง log error
      }
    }

    // ถ้าไม่มีการเชื่อมต่อหรือ API ล้มเหลว ใช้ค่าเริ่มต้น
    return this.getDefaultSchedule();
  }

  private async saveScheduleToLocal(schedule: ScheduleConfig): Promise<void> {
    try {
      localStorage.setItem("scheduleConfig", JSON.stringify(schedule));
    } catch (error) {
      console.error("Error saving schedule to local storage:", error);
    }
  }

  private async getScheduleFromLocal(): Promise<ScheduleConfig | null> {
    try {
      const saved = localStorage.getItem("scheduleConfig");
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error("Error getting schedule from local storage:", error);
      return null;
    }
  }

  private getDefaultSchedule(): ScheduleConfig {
    return {
      checkInTime: "08:00",
      checkOutTime: "17:00",
      lateTime: "08:30",
      absentTime: "09:00",
    };
  }
}
