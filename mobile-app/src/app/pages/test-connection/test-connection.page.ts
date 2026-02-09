import { Component, OnInit } from "@angular/core";
import { SupabaseService } from "../../services/supabase.service";
import { StorageService } from "../../services/storage.service";

@Component({
  selector: "app-test-connection",
  templateUrl: "./test-connection.page.html",
  styleUrls: ["./test-connection.page.scss"],
})
export class TestConnectionPage implements OnInit {
  results: any[] = [];
  isLoading = false;

  constructor(
    private supabase: SupabaseService,
    private storage: StorageService
  ) {}

  ngOnInit() {
    this.addResult("info", "พร้อมทดสอบการเชื่อมต่อ Supabase");
  }

  addResult(
    type: "success" | "error" | "info" | "warning",
    message: string,
    data?: any
  ) {
    this.results.unshift({
      type,
      message,
      data,
      timestamp: new Date().toLocaleTimeString("th-TH"),
    });
  }

  async testBasicConnection() {
    this.isLoading = true;
    this.addResult("info", "กำลังทดสอบการเชื่อมต่อพื้นฐาน...");

    try {
      const isConnected = await this.supabase.checkConnection();
      if (isConnected) {
        this.addResult("success", "✅ เชื่อมต่อ Supabase สำเร็จ");
        this.addResult("info", `URL: https://zjyrciehnvjouakzvwxk.supabase.co`);
      } else {
        this.addResult("error", "❌ ไม่สามารถเชื่อมต่อ Supabase ได้");
      }
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async testGetCompanies() {
    this.isLoading = true;
    this.addResult("info", "กำลังดึงข้อมูล companies...");

    try {
      const companies = await this.supabase.getCompanies();
      if (companies.length > 0) {
        this.addResult(
          "success",
          `✅ พบข้อมูล ${companies.length} บริษัท`,
          companies
        );
      } else {
        this.addResult("warning", "⚠️ ไม่พบข้อมูลบริษัท");
      }
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async testGetOrCreateCompany() {
    this.isLoading = true;
    this.addResult("info", "กำลังทดสอบ getOrCreateDefaultCompany...");

    try {
      const companyId = await this.supabase.getOrCreateDefaultCompany();
      if (companyId && companyId !== "00000000-0000-0000-0000-000000000000") {
        this.addResult("success", `✅ Company ID: ${companyId}`);
      } else {
        this.addResult("warning", "⚠️ ใช้ fallback company ID");
      }
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async testSyncAttendance() {
    this.isLoading = true;
    this.addResult("info", "กำลังทดสอบซิงค์ attendance...");

    try {
      const result = await this.storage.syncUnsyncedRecords();
      this.addResult(
        result.synced > 0 ? "success" : "warning",
        `Synced: ${result.synced}, Failed: ${result.failed}`,
        result
      );
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async testSyncProfiles() {
    this.isLoading = true;
    this.addResult("info", "กำลังทดสอบซิงค์ user profiles...");

    try {
      const result = await this.storage.syncUserProfiles();
      this.addResult(
        result.synced > 0 ? "success" : "warning",
        `Synced: ${result.synced}, Failed: ${result.failed}`,
        result
      );
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async testFullSync() {
    this.isLoading = true;
    this.addResult("info", "กำลังทดสอบ Full Sync (attendance + profiles)...");

    try {
      await this.storage.autoSync();
      this.addResult("success", "✅ Full sync เสร็จสมบูรณ์");
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  async checkLocalData() {
    this.isLoading = true;
    this.addResult("info", "กำลังตรวจสอบข้อมูลใน IndexedDB...");

    try {
      const records = await this.storage.getAttendanceRecords();
      const unsynced = records.filter((r) => !r.synced);
      const profiles = await this.storage.getAllUsers();

      this.addResult(
        "info",
        `📊 Attendance: ${records.length} (Unsynced: ${unsynced.length})`
      );
      this.addResult("info", `👥 Profiles: ${profiles.length}`);

      if (unsynced.length > 0) {
        this.addResult(
          "warning",
          `⚠️ มี ${unsynced.length} รายการที่ยังไม่ sync`
        );
      }
    } catch (error: any) {
      this.addResult("error", "❌ เกิดข้อผิดพลาด", error.message);
    }

    this.isLoading = false;
  }

  clearResults() {
    this.results = [];
    this.addResult("info", "ล้างผลลัพธ์แล้ว");
  }
  getIcon(type: string): string {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      default:
        return "information-circle";
    }
  }
}
