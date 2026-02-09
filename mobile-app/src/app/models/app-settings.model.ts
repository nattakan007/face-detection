/**
 * App Settings Model
 * ระบบการตั้งค่าแอปพลิเคชันทั้งหมด
 */

export interface WorkShift {
  id: string;
  name: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isActive: boolean;
}

export interface AppSettings {
  version: string;
  lastUpdated: number;

  // ตั้งค่าตารางเวลา (Schedule Settings)
  schedule: {
    checkInTime: string; // เวลาเข้างาน (เช่น "08:00")
    checkOutTime: string; // เวลาออกงาน (เช่น "17:00")
    lateTime: string; // เวลาสาย (เช่น "08:30")
    absentTime: string; // เวลาขาดงาน (เช่น "09:00")
  };

  // ตั้งค่าการตรวจจับใบหน้า (Face Detection Settings)
  faceDetection: {
    // ค่าความแม่นยำขั้นต่ำ (Minimum Confidence Thresholds)
    minConfidence: number; // 0.65-1.0 (65-100%) - การตรวจจับใบหน้าทั่วไป
    registrationMinConfidence: number; // 0.65-1.0 (65-100%) - การลงทะเบียน
    manualCheckInMinConfidence: number; // 0.65-1.0 (65-100%) - การเข้างานด้วยตัวเอง
    realTimeMinConfidence: number; // 0.50-1.0 (50-100%) - การตรวจจับแบบ real-time

    // ค่าความใกล้เคียงในการเปรียบเทียบ (Face Matching Thresholds)
    matchDistanceThreshold: number; // 0-1 (Euclidean distance)
    minSimilarityPercent: number; // 0.65-1.0 (65-100%) - ความคล้ายคลึงขั้นต่ำ
    duplicateThreshold: number; // 0-1 - ตรวจจับใบหน้าซ้ำ

    // ตั้งค่าการถ่ายภาพอัตโนมัติ (Auto-capture Settings)
    autoCaptureEnabled: boolean;
    autoCaptureThresholdScan: number; // 0.65-1.0 (65-100%) - สแกนเข้างาน
    autoCaptureThresholdRegister: number; // 0.65-1.0 (65-100%) - ลงทะเบียน
    autoCaptureCooldown: number; // milliseconds - ระยะเวลาพักระหว่างการถ่าย

    // ระยะเวลาการสแกน (Scan Duration)
    scanTimeout: number; // milliseconds - เวลาสแกนสูงสุด
  };

  // ตั้งค่ากล้อง (Camera Settings)
  camera: {
    captureTimeout: number; // milliseconds
    accessTimeout: number; // milliseconds
    initDelay: number; // milliseconds
    facingMode: "user" | "environment"; // 'user' = กล้องหน้า
    quality: number; // 0-100
  };

  // ตั้งค่าการบันทึกเข้างาน (Attendance Settings)
  attendance: {
    duplicatePreventionWindow: number; // milliseconds - ห้ามเข้างานซ้ำภายในเวลานี้
    requireLocation: boolean; // บังคับให้มีตำแหน่ง GPS
    requirePhoto: boolean; // บังคับให้มีรูปภาพ
    autoCheckoutEnabled: boolean; // เปิดใช้งานออกงานอัตโนมัติ
    autoCheckoutHours: number; // ชั่วโมง - ออกงานอัตโนมัติเมื่อครบเวลา (เช่น 8 ชั่วโมง)
  };

  // ตั้งค่ากะเวลาทำงาน (Work Shifts)
  workShifts: {
    enabled: boolean; // เปิดใช้งานระบบกะ
    shifts: WorkShift[]; // รายการกะทำงาน
    defaultShiftId: string | null; // กะเริ่มต้น
  };

  // ตั้งค่าการจัดเก็บข้อมูล (Storage Settings)
  storage: {
    recordRetentionDays: number; // จำนวนวันเก็บข้อมูล
    autoCleanupEnabled: boolean; // ลบข้อมูลเก่าอัตโนมัติ
    settingsCacheDuration: number; // milliseconds
  };

  // ตั้งค่า API (API Settings)
  api: {
    enabled: boolean;
    url: string;
    timeout: number; // milliseconds
    syncInterval: number; // milliseconds (0 = ปิดการ sync อัตโนมัติ)
  };

  // ตั้งค่า UI/UX
  ui: {
    language: "th" | "en";
    theme: "light" | "dark" | "auto";
    showConfidenceScores: boolean; // แสดงคะแนนความแม่นยำ
    hapticFeedback: boolean; // สั่นเมื่อกดปุ่ม
  };
}

/**
 * Default Settings Factory
 * สร้างค่าเริ่มต้นสำหรับการตั้งค่าทั้งหมด
 */
export class AppSettingsDefaults {
  /**
   * ค่าเริ่มต้นแบบปกติ (Balanced)
   */
  static getDefaults(): AppSettings {
    return {
      version: "1.0.0",
      lastUpdated: Date.now(),

      schedule: {
        checkInTime: "08:00",
        checkOutTime: "17:00",
        lateTime: "08:30",
        absentTime: "09:00",
      },

      faceDetection: {
        minConfidence: 0.8, // 80%
        registrationMinConfidence: 0.8, // 80%
        manualCheckInMinConfidence: 0.7, // 70%
        realTimeMinConfidence: 0.5, // 50%
        matchDistanceThreshold: 0.6,
        minSimilarityPercent: 0.7, // 70%
        duplicateThreshold: 0.6,
        autoCaptureEnabled: true,
        autoCaptureThresholdScan: 0.9, // 90%
        autoCaptureThresholdRegister: 0.85, // 85%
        autoCaptureCooldown: 2000, // 2 วินาที
        scanTimeout: 30000, // 30 วินาที
      },

      camera: {
        captureTimeout: 30000,
        accessTimeout: 15000,
        initDelay: 1000,
        facingMode: "user",
        quality: 90,
      },

      attendance: {
        duplicatePreventionWindow: 300000, // 5 นาที
        requireLocation: false,
        requirePhoto: true,
        autoCheckoutEnabled: false,
        autoCheckoutHours: 8, // 8 ชั่วโมง
      },

      workShifts: {
        enabled: false,
        shifts: [
          {
            id: "morning",
            name: "กะเช้า",
            startTime: "06:00",
            endTime: "14:00",
            isActive: true,
          },
          {
            id: "afternoon",
            name: "กะบ่าย",
            startTime: "14:00",
            endTime: "22:00",
            isActive: true,
          },
          {
            id: "night",
            name: "กะดึก",
            startTime: "22:00",
            endTime: "06:00",
            isActive: true,
          },
        ],
        defaultShiftId: null,
      },

      storage: {
        recordRetentionDays: 30,
        autoCleanupEnabled: false,
        settingsCacheDuration: 300000, // 5 นาที
      },

      api: {
        enabled: false,
        url: "https://your-api-server.com/api",
        timeout: 5000,
        syncInterval: 0, // ปิด auto-sync
      },

      ui: {
        language: "th",
        theme: "auto",
        showConfidenceScores: true,
        hapticFeedback: false,
      },
    };
  }

  /**
   * ค่าเริ่มต้นแบบเข้มงวด (Strict)
   * ความแม่นยำสูง, ป้องกันการเข้างานผิดพลาด
   */
  static getStrictPreset(): AppSettings {
    const defaults = this.getDefaults();
    return {
      ...defaults,
      faceDetection: {
        ...defaults.faceDetection,
        minConfidence: 0.9, // 90%
        registrationMinConfidence: 0.9, // 90%
        manualCheckInMinConfidence: 0.85, // 85%
        minSimilarityPercent: 0.85, // 85%
        autoCaptureThresholdScan: 0.9, // 90%
        autoCaptureThresholdRegister: 0.85, // 85%
      },
      attendance: {
        ...defaults.attendance,
        duplicatePreventionWindow: 600000, // 10 นาที
        requireLocation: true,
        requirePhoto: true,
      },
    };
  }

  /**
   * ค่าเริ่มต้นแบบยืดหยุ่น (Lenient)
   * ความแม่นยำต่ำ, ใช้งานง่าย
   */
  static getLenientPreset(): AppSettings {
    const defaults = this.getDefaults();
    return {
      ...defaults,
      faceDetection: {
        ...defaults.faceDetection,
        minConfidence: 0.65, // 65%
        registrationMinConfidence: 0.7, // 70%
        manualCheckInMinConfidence: 0.65, // 65%
        minSimilarityPercent: 0.65, // 65%
        autoCaptureThresholdScan: 0.9, // 90%
        autoCaptureThresholdRegister: 0.8, // 80%
      },
      attendance: {
        ...defaults.attendance,
        duplicatePreventionWindow: 180000, // 3 นาที
        requireLocation: false,
        requirePhoto: false,
      },
    };
  }
}

/**
 * Settings Validation Helper
 * ตรวจสอบความถูกต้องของค่าที่ตั้ง
 */
export class AppSettingsValidator {
  /**
   * ตรวจสอบค่า confidence (ต้องอยู่ระหว่าง 0.65-1.0)
   */
  static validateConfidence(
    value: number,
    min: number = 0.65,
    max: number = 1.0,
  ): boolean {
    return value >= min && value <= max;
  }

  /**
   * ตรวจสอบค่าเวลา (HH:mm format)
   */
  static validateTime(time: string): boolean {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return timeRegex.test(time);
  }

  /**
   * ตรวจสอบว่ากะเวลาไม่ซ้อนทับกัน
   */
  static validateShiftsNoOverlap(shifts: WorkShift[]): boolean {
    const activeShifts = shifts.filter((s) => s.isActive);

    for (let i = 0; i < activeShifts.length; i++) {
      for (let j = i + 1; j < activeShifts.length; j++) {
        const shift1 = activeShifts[i];
        const shift2 = activeShifts[j];

        // ตรวจสอบการซ้อนทับ (simplified - ไม่รองรับข้ามวัน)
        const start1 = this.timeToMinutes(shift1.startTime);
        const end1 = this.timeToMinutes(shift1.endTime);
        const start2 = this.timeToMinutes(shift2.startTime);
        const end2 = this.timeToMinutes(shift2.endTime);

        if (this.rangesOverlap(start1, end1, start2, end2)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * แปลงเวลาเป็นนาที
   */
  private static timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  /**
   * ตรวจสอบว่าช่วงเวลาซ้อนทับกันหรือไม่
   */
  private static rangesOverlap(
    start1: number,
    end1: number,
    start2: number,
    end2: number,
  ): boolean {
    return start1 < end2 && start2 < end1;
  }

  /**
   * ตรวจสอบค่าตั้งทั้งหมด
   */
  static validateSettings(settings: AppSettings): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // ตรวจสอบ confidence values
    if (!this.validateConfidence(settings.faceDetection.minConfidence)) {
      errors.push("ค่าความแม่นยำขั้นต่ำต้องอยู่ระหว่าง 65-100%");
    }

    if (!this.validateConfidence(settings.faceDetection.minSimilarityPercent)) {
      errors.push("ค่าความคล้ายคลึงขั้นต่ำต้องอยู่ระหว่าง 65-100%");
    }

    // ตรวจสอบเวลา
    if (!this.validateTime(settings.schedule.checkInTime)) {
      errors.push("รูปแบบเวลาเข้างานไม่ถูกต้อง");
    }

    if (!this.validateTime(settings.schedule.checkOutTime)) {
      errors.push("รูปแบบเวลาออกงานไม่ถูกต้อง");
    }

    // ตรวจสอบว่าเวลาเข้างานก่อนเวลาออกงาน
    if (
      this.timeToMinutes(settings.schedule.checkInTime) >=
      this.timeToMinutes(settings.schedule.checkOutTime)
    ) {
      errors.push("เวลาเข้างานต้องอยู่ก่อนเวลาออกงาน");
    }

    // ตรวจสอบกะเวลาทำงาน
    if (
      settings.workShifts.enabled &&
      !this.validateShiftsNoOverlap(settings.workShifts.shifts)
    ) {
      errors.push("กะเวลาทำงานมีการซ้อนทับกัน");
    }

    // ตรวจสอบค่า auto checkout
    if (
      settings.attendance.autoCheckoutEnabled &&
      settings.attendance.autoCheckoutHours <= 0
    ) {
      errors.push("ชั่วโมงออกงานอัตโนมัติต้องมากกว่า 0");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
