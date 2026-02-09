import { Injectable, OnDestroy } from "@angular/core";
import { StorageService, AttendanceRecord } from "./storage.service";
import { SettingsService } from "./settings.service";

/**
 * Auto Checkout Service
 * ระบบออกงานอัตโนมัติเมื่อพนักงานทำงานครบตามเวลาที่กำหนด
 */
@Injectable({
  providedIn: "root",
})
export class AutoCheckoutService implements OnDestroy {
  private checkInterval: any = null;
  private readonly CHECK_INTERVAL_MS = 5 * 60 * 1000; // ตรวจสอบทุก 5 นาที
  private isMonitoring = false;

  constructor(
    private storage: StorageService,
    private settingsService: SettingsService
  ) {}

  /**
   * เริ่มต้นการตรวจสอบอัตโนมัติ
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log("Auto checkout monitoring is already running");
      return;
    }

    // โหลด settings
    const attendanceSettings =
      await this.settingsService.getAttendanceSettings();

    if (!attendanceSettings.autoCheckoutEnabled) {
      console.log("Auto checkout is disabled in settings");
      return;
    }

    console.log(
      `Starting auto checkout monitoring (every ${
        this.CHECK_INTERVAL_MS / 1000 / 60
      } minutes)`
    );
    console.log(
      `Auto checkout after ${attendanceSettings.autoCheckoutHours} hours of work`
    );

    this.isMonitoring = true;

    // ตรวจสอบทันทีเมื่อเริ่ม
    await this.checkAndAutoCheckout();

    // ตั้ง interval สำหรับตรวจสอบต่อเนื่อง
    this.checkInterval = setInterval(async () => {
      await this.checkAndAutoCheckout();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * หยุดการตรวจสอบ
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isMonitoring = false;
    console.log("Auto checkout monitoring stopped");
  }

  /**
   * ตรวจสอบและสร้าง auto checkout records
   */
  async checkAndAutoCheckout(): Promise<void> {
    try {
      const attendanceSettings =
        await this.settingsService.getAttendanceSettings();

      if (!attendanceSettings.autoCheckoutEnabled) {
        return;
      }

      const maxHours = attendanceSettings.autoCheckoutHours;
      const maxMs = maxHours * 60 * 60 * 1000;

      const records = await this.storage.getAttendanceRecords();
      const today = new Date().toDateString();
      const now = Date.now();

      // หา check-in records ของวันนี้ที่ยังไม่มี checkout
      const todayCheckIns = records.filter(
        (r) =>
          r.type === "check-in" &&
          new Date(r.timestamp).toDateString() === today
      );

      for (const checkIn of todayCheckIns) {
        // ตรวจสอบว่ามี checkout แล้วหรือยัง
        const hasCheckout = records.some(
          (r) =>
            r.type === "check-out" &&
            r.employeeId === checkIn.employeeId &&
            new Date(r.timestamp).toDateString() === today &&
            r.timestamp > checkIn.timestamp
        );

        if (hasCheckout) {
          continue; // มี checkout แล้ว ข้าม
        }

        // คำนวณเวลาทำงาน
        const hoursWorked = (now - checkIn.timestamp) / (1000 * 60 * 60);

        if (hoursWorked >= maxHours) {
          console.log(
            `Auto checkout for ${
              checkIn.employeeName || checkIn.employeeId
            }: worked ${hoursWorked.toFixed(1)} hours`
          );

          // สร้าง auto checkout record
          const checkoutRecord: AttendanceRecord = {
            id: `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: "check-out",
            timestamp: checkIn.timestamp + maxMs, // เวลา checkout = check-in + max hours
            date: new Date(checkIn.timestamp + maxMs).toLocaleDateString(
              "th-TH"
            ),
            time: new Date(checkIn.timestamp + maxMs).toLocaleTimeString(
              "th-TH",
              { hour: "2-digit", minute: "2-digit" }
            ),
            synced: false,
            employeeId: checkIn.employeeId,
            employeeName: checkIn.employeeName,
            employeeDepartment: checkIn.employeeDepartment,
            isAutoCheckout: true, // Flag บอกว่าเป็น auto checkout
          };

          // บันทึก record
          await this.storage.addAttendanceRecord(checkoutRecord);

          console.log(
            `Auto checkout created for ${
              checkIn.employeeName || checkIn.employeeId
            }`
          );
        }
      }
    } catch (error) {
      console.error("Error in auto checkout:", error);
    }
  }

  /**
   * ตรวจสอบสถานะการ monitoring
   */
  isRunning(): boolean {
    return this.isMonitoring;
  }

  /**
   * Cleanup เมื่อ service ถูก destroy
   */
  ngOnDestroy(): void {
    this.stopMonitoring();
  }
}
