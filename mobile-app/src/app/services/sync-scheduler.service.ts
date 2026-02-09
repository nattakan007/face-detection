import { Injectable } from "@angular/core";
import { StorageService } from "./storage.service";
import { Network } from "@capacitor/network";

@Injectable({
  providedIn: "root",
})
export class SyncSchedulerService {
  private syncInterval: any = null;
  private lastSyncTime: number = 0;
  private minimumSyncInterval: number = 30000; // 30 seconds minimum between syncs
  private isSyncing: boolean = false;

  constructor(private storage: StorageService) {}

  /**
   * Start automatic sync scheduler
   * @param intervalMinutes Interval in minutes (default: 5 minutes)
   */
  startAutoSync(intervalMinutes: number = 5): void {
    if (this.syncInterval) {
      console.log("Auto-sync already running");
      return;
    }

    const intervalMs = intervalMinutes * 60 * 1000;
    console.log(`Starting auto-sync every ${intervalMinutes} minutes`);

    // Initial sync after 5 seconds
    setTimeout(() => {
      this.performSync();
    }, 5000);

    // Schedule periodic sync
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
  }

  /**
   * Stop automatic sync scheduler
   */
  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("Auto-sync stopped");
    }
  }

  /**
   * Manually trigger sync (with duplicate prevention)
   */
  async manualSync(): Promise<{ success: boolean; message: string }> {
    const timeSinceLastSync = Date.now() - this.lastSyncTime;

    if (this.isSyncing) {
      return {
        success: false,
        message: "กำลังซิงค์อยู่ กรุณารอสักครู่...",
      };
    }

    if (timeSinceLastSync < this.minimumSyncInterval) {
      const remainingSeconds = Math.ceil(
        (this.minimumSyncInterval - timeSinceLastSync) / 1000
      );
      return {
        success: false,
        message: `กรุณารออีก ${remainingSeconds} วินาที`,
      };
    }

    const result = await this.performSync();
    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * Get last sync timestamp
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Get formatted last sync time
   */
  getFormattedLastSyncTime(): string {
    if (this.lastSyncTime === 0) {
      return "ยังไม่เคยซิงค์";
    }

    const now = Date.now();
    const diff = now - this.lastSyncTime;

    if (diff < 60000) {
      return "เมื่อสักครู่";
    } else if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} นาทีที่แล้ว`;
    } else if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ชั่วโมงที่แล้ว`;
    } else {
      const date = new Date(this.lastSyncTime);
      return date.toLocaleString("th-TH");
    }
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Perform sync operation
   */
  private async performSync(): Promise<{ success: boolean; message: string }> {
    // Check network status
    const status = await Network.getStatus();
    if (!status.connected) {
      console.log("No network connection, skipping sync");
      return {
        success: false,
        message: "ไม่มีการเชื่อมต่ออินเทอร์เน็ต",
      };
    }

    // Check if already syncing
    if (this.isSyncing) {
      console.log("Sync already in progress, skipping");
      return {
        success: false,
        message: "กำลังซิงค์อยู่",
      };
    }

    // Check minimum interval
    const timeSinceLastSync = Date.now() - this.lastSyncTime;
    if (timeSinceLastSync < this.minimumSyncInterval) {
      console.log("Too soon since last sync, skipping");
      return {
        success: false,
        message: "ซิงค์เร็วเกินไป",
      };
    }

    try {
      this.isSyncing = true;
      console.log("Starting background sync...");

      await this.storage.autoSync();

      this.lastSyncTime = Date.now();
      console.log("Background sync completed successfully");

      return {
        success: true,
        message: "ซิงค์ข้อมูลสำเร็จ",
      };
    } catch (error) {
      console.error("Background sync failed:", error);
      return {
        success: false,
        message: "ซิงค์ข้อมูลล้มเหลว",
      };
    } finally {
      this.isSyncing = false;
    }
  }
}
