import { Component, OnInit } from "@angular/core";
import { SettingsService } from "../../services/settings.service";
import {
  AppSettings,
  WorkShift,
  AppSettingsDefaults,
} from "../../models/app-settings.model";
import {
  AlertController,
  ToastController,
  LoadingController,
  ModalController,
} from "@ionic/angular";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import { PinChangeComponent } from "../../components/pin-change/pin-change.component";
import { StorageService } from "../../services/storage.service";

@Component({
  selector: "app-admin-settings",
  templateUrl: "./admin-settings.page.html",
  styleUrls: ["./admin-settings.page.scss"],
})
export class AdminSettingsPage implements OnInit {
  settings!: AppSettings;
  originalSettings!: AppSettings;

  // UI state
  selectedSegment: string = "face"; // face, schedule, shifts, attendance, advanced, data
  hasUnsavedChanges: boolean = false;
  sessionTimeRemaining: number = 30;

  constructor(
    private settingsService: SettingsService,
    private alertCtrl: AlertController,
    private toastCtrl: ToastController,
    private loadingCtrl: LoadingController,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
    private storageService: StorageService
  ) {}

  async ngOnInit() {
    await this.loadSettings();
    await this.updateSessionTime();

    // Update session time every minute
    setInterval(async () => {
      await this.updateSessionTime();
    }, 60000);
  }

  async updateSessionTime() {
    this.sessionTimeRemaining =
      await this.authService.getSessionTimeRemaining();
  }

  async loadSettings() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังโหลดการตั้งค่า...",
    });
    await loading.present();

    try {
      this.settings = await this.settingsService.getAppSettings();
      this.originalSettings = JSON.parse(JSON.stringify(this.settings)); // Deep clone
    } catch (error) {
      console.error("Error loading settings:", error);
      await this.showToast("เกิดข้อผิดพลาดในการโหลดการตั้งค่า", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  async saveSettings() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังบันทึก...",
    });
    await loading.present();

    try {
      const result = await this.settingsService.updateAppSettings(
        this.settings
      );

      if (result.success) {
        this.originalSettings = JSON.parse(JSON.stringify(this.settings));
        this.hasUnsavedChanges = false;
        await this.showToast("บันทึกการตั้งค่าเรียบร้อย", "success");
      } else {
        await this.showAlert(
          "ข้อผิดพลาด",
          result.errors?.join("\n") || "เกิดข้อผิดพลาด"
        );
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      await this.showToast("เกิดข้อผิดพลาดในการบันทึก", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  async resetToDefaults() {
    const alert = await this.alertCtrl.create({
      header: "รีเซ็ตการตั้งค่า",
      message: "คุณต้องการรีเซ็ตการตั้งค่าทั้งหมดเป็นค่าเริ่มต้นหรือไม่?",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "รีเซ็ต",
          handler: async () => {
            await this.settingsService.resetToDefaults();
            await this.loadSettings();
            await this.showToast("รีเซ็ตการตั้งค่าเรียบร้อย", "success");
          },
        },
      ],
    });
    await alert.present();
  }

  async loadPreset(preset: "strict" | "balanced" | "lenient") {
    const presetNames = {
      strict: "เข้มงวด",
      balanced: "ปานกลาง",
      lenient: "ยืดหยุ่น",
    };

    const alert = await this.alertCtrl.create({
      header: "โหลด Preset",
      message: `โหลดการตั้งค่าแบบ${presetNames[preset]}หรือไม่?`,
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "โหลด",
          handler: async () => {
            await this.settingsService.loadPreset(preset);
            await this.loadSettings();
            await this.showToast(
              `โหลดการตั้งค่าแบบ${presetNames[preset]}เรียบร้อย`,
              "success"
            );
          },
        },
      ],
    });
    await alert.present();
  }

  onSettingChange() {
    this.hasUnsavedChanges =
      JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings);
  }

  /**
   * Open PIN change modal
   */
  async openPinChange() {
    const modal = await this.modalController.create({
      component: PinChangeComponent,
    });

    await modal.present();

    const { data, role } = await modal.onWillDismiss();

    if (role === "confirm" && data?.success) {
      // PIN changed successfully
      await this.showToast("เปลี่ยนรหัส PIN เรียบร้อยแล้ว", "success");
    }
  }

  async canDeactivate(): Promise<boolean> {
    if (!this.hasUnsavedChanges) {
      return true;
    }

    const alert = await this.alertCtrl.create({
      header: "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก",
      message: "คุณต้องการออกโดยไม่บันทึกการเปลี่ยนแปลงหรือไม่?",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ออกโดยไม่บันทึก",
          handler: () => {
            return true;
          },
        },
      ],
    });

    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role !== "cancel";
  }

  async goBack() {
    if (await this.canDeactivate()) {
      this.router.navigate(["/scan"]);
    }
  }

  // Work Shifts Management
  async addShift() {
    const alert = await this.alertCtrl.create({
      header: "เพิ่มกะทำงาน",
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: "ชื่อกะ (เช่น กะเช้า)",
        },
        {
          name: "startTime",
          type: "time",
          placeholder: "เวลาเริ่ม",
        },
        {
          name: "endTime",
          type: "time",
          placeholder: "เวลาสิ้นสุด",
        },
      ],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "เพิ่ม",
          handler: (data) => {
            if (!data.name || !data.startTime || !data.endTime) {
              this.showToast("กรุณากรอกข้อมูลให้ครบถ้วน", "warning");
              return false;
            }

            const newShift: WorkShift = {
              id: `shift_${Date.now()}`,
              name: data.name,
              startTime: data.startTime,
              endTime: data.endTime,
              isActive: true,
            };

            this.settings.workShifts.shifts.push(newShift);
            this.onSettingChange();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editShift(shift: WorkShift, index: number) {
    const alert = await this.alertCtrl.create({
      header: "แก้ไขกะทำงาน",
      inputs: [
        {
          name: "name",
          type: "text",
          placeholder: "ชื่อกะ",
          value: shift.name,
        },
        {
          name: "startTime",
          type: "time",
          value: shift.startTime,
        },
        {
          name: "endTime",
          type: "time",
          value: shift.endTime,
        },
      ],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "บันทึก",
          handler: (data) => {
            this.settings.workShifts.shifts[index] = {
              ...shift,
              name: data.name,
              startTime: data.startTime,
              endTime: data.endTime,
            };
            this.onSettingChange();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteShift(index: number) {
    const alert = await this.alertCtrl.create({
      header: "ลบกะทำงาน",
      message: "คุณต้องการลบกะทำงานนี้หรือไม่?",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ลบ",
          handler: () => {
            this.settings.workShifts.shifts.splice(index, 1);
            this.onSettingChange();
          },
        },
      ],
    });
    await alert.present();
  }

  toggleShift(shift: WorkShift) {
    shift.isActive = !shift.isActive;
    this.onSettingChange();
  }

  // Helper methods
  formatPercent(value: number): string {
    return Math.round(value * 100) + "%";
  }

  formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds} วินาที`;
    }
    const minutes = Math.floor(seconds / 60);
    return `${minutes} นาที`;
  }

  formatHours(hours: number): string {
    return `${hours} ชั่วโมง`;
  }

  // ==================== DATA MANAGEMENT ====================

  async clearAllEmployees() {
    const alert = await this.alertCtrl.create({
      header: "ยืนยันการลบข้อมูล",
      message:
        "คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลพนักงานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ลบทั้งหมด",
          role: "destructive",
          handler: async () => {
            await this.confirmClearEmployees();
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmClearEmployees() {
    const confirmAlert = await this.alertCtrl.create({
      header: "ยืนยันอีกครั้ง",
      message: "กรุณาพิมพ์ DELETE เพื่อยืนยันการลบข้อมูลพนักงานทั้งหมด",
      inputs: [
        {
          name: "confirmation",
          type: "text",
          placeholder: "พิมพ์ DELETE",
        },
      ],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ยืนยัน",
          handler: async (data) => {
            if (data.confirmation === "DELETE") {
              await this.executeClearEmployees();
              return true;
            } else {
              await this.showToast("กรุณาพิมพ์ DELETE เพื่อยืนยัน", "warning");
              return false;
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  private async executeClearEmployees() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังลบข้อมูลพนักงาน...",
    });
    await loading.present();

    try {
      await this.storageService.clearAllUsers();
      await this.showToast("ลบข้อมูลพนักงานทั้งหมดเรียบร้อย", "success");
    } catch (error) {
      console.error("Error clearing employees:", error);
      await this.showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  async clearAllAttendance() {
    const alert = await this.alertCtrl.create({
      header: "ยืนยันการลบข้อมูล",
      message:
        "คุณแน่ใจหรือไม่ว่าต้องการลบประวัติการเข้างานทั้งหมด? การกระทำนี้ไม่สามารถย้อนกลับได้",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ลบทั้งหมด",
          role: "destructive",
          handler: async () => {
            await this.confirmClearAttendance();
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmClearAttendance() {
    const confirmAlert = await this.alertCtrl.create({
      header: "ยืนยันอีกครั้ง",
      message: "กรุณาพิมพ์ DELETE เพื่อยืนยันการลบประวัติการเข้างานทั้งหมด",
      inputs: [
        {
          name: "confirmation",
          type: "text",
          placeholder: "พิมพ์ DELETE",
        },
      ],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ยืนยัน",
          handler: async (data) => {
            if (data.confirmation === "DELETE") {
              await this.executeClearAttendance();
              return true;
            } else {
              await this.showToast("กรุณาพิมพ์ DELETE เพื่อยืนยัน", "warning");
              return false;
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  private async executeClearAttendance() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังลบประวัติการเข้างาน...",
    });
    await loading.present();

    try {
      await this.storageService.clearAllAttendance();
      await this.showToast("ลบประวัติการเข้างานทั้งหมดเรียบร้อย", "success");
    } catch (error) {
      console.error("Error clearing attendance:", error);
      await this.showToast("เกิดข้อผิดพลาดในการลบข้อมูล", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  async resetAllData() {
    const alert = await this.alertCtrl.create({
      header: "⚠️ รีเซ็ตระบบทั้งหมด",
      message:
        "คุณแน่ใจหรือไม่ว่าต้องการรีเซ็ตข้อมูลทั้งหมด (พนักงาน + ประวัติการเข้างาน)? การกระทำนี้ไม่สามารถย้อนกลับได้",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "รีเซ็ตทั้งหมด",
          role: "destructive",
          handler: async () => {
            await this.confirmResetAllData();
          },
        },
      ],
    });
    await alert.present();
  }

  private async confirmResetAllData() {
    const confirmAlert = await this.alertCtrl.create({
      header: "ยืนยันการรีเซ็ตระบบ",
      message: "กรุณาพิมพ์ RESET เพื่อยืนยันการรีเซ็ตข้อมูลทั้งหมด",
      inputs: [
        {
          name: "confirmation",
          type: "text",
          placeholder: "พิมพ์ RESET",
        },
      ],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ยืนยัน",
          handler: async (data) => {
            if (data.confirmation === "RESET") {
              await this.executeResetAllData();
              return true;
            } else {
              await this.showToast("กรุณาพิมพ์ RESET เพื่อยืนยัน", "warning");
              return false;
            }
          },
        },
      ],
    });
    await confirmAlert.present();
  }

  private async executeResetAllData() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังรีเซ็ตระบบ...",
    });
    await loading.present();

    try {
      await this.storageService.resetAllData();
      await this.showToast("รีเซ็ตระบบเรียบร้อย", "success");
    } catch (error) {
      console.error("Error resetting data:", error);
      await this.showToast("เกิดข้อผิดพลาดในการรีเซ็ตระบบ", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  // ==================== END DATA MANAGEMENT ====================

  private async showToast(message: string, color: string = "primary") {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: "bottom",
    });
    await toast.present();
  }

  private async showAlert(header: string, message: string) {
    const alert = await this.alertCtrl.create({
      header,
      message,
      buttons: ["ตกลง"],
    });
    await alert.present();
  }
}
