import { Component, OnInit } from "@angular/core";
import { Platform, AlertController } from "@ionic/angular";
import { StorageService } from "../../services/storage.service";
import { FaceDetectionService } from "../../services/face-detection.service";
import { UserProfile } from "../../services/storage.service";

@Component({
  selector: "app-employees",
  templateUrl: "./employees.page.html",
  styleUrls: ["./employees.page.scss"],
})
export class EmployeesPage implements OnInit {
  employees: UserProfile[] = [];
  isLoading = true;
  showTestButton = false;

  constructor(
    private storage: StorageService,
    private faceDetection: FaceDetectionService,
    private platform: Platform,
    private alertCtrl: AlertController,
  ) {}

  async ngOnInit() {
    // Show test button only on browser
    this.showTestButton = !this.platform.is("capacitor");
    await this.loadEmployees();
  }

  async ionViewWillEnter() {
    await this.loadEmployees();
  }

  async loadEmployees() {
    this.isLoading = true;
    try {
      const allUsers = await this.storage.getAllUsers();
      this.employees = allUsers;
    } catch (error) {
      console.error("Error loading employees:", error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    await this.loadEmployees();
    event.target.complete();
  }

  /**
   * ลบพนักงาน - ยืนยัน 1 ครั้งแล้วลบทันที
   */
  async deleteEmployee(employee: UserProfile) {
    const alert = await this.alertCtrl.create({
      header: "ลบพนักงาน",
      message: `ต้องการลบ "${employee.name}" ออกจากระบบ?`,
      cssClass: "delete-alert",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ลบ",
          role: "destructive",
          handler: async () => {
            try {
              await this.storage.deleteUser(employee.id);
              this.employees = this.employees.filter(
                (e) => e.id !== employee.id,
              );
              console.log(`[EMPLOYEES] Deleted: ${employee.name}`);
            } catch (error) {
              console.error("[EMPLOYEES] Delete error:", error);
            }
          },
        },
      ],
    });
    await alert.present();
  }

  /**
   * สร้างพนักงานทดสอบ (แสดงเฉพาะบน browser)
   */
  async createTestEmployee() {
    this.isLoading = true;
    try {
      console.log('[EMPLOYEES] Creating test employee "ทรี"...');

      // โหลดภาพทดสอบ
      const testImagePath = "assets/test-employee.jpg";
      const response = await fetch(testImagePath);
      const blob = await response.blob();
      const base64Image = await this.blobToBase64(blob);

      // ตรวจจับใบหน้า
      const detection = await this.faceDetection.detectFace(base64Image);

      if (!detection.detected || !detection.descriptor) {
        console.error("[EMPLOYEES] Cannot detect face in test image");
        alert("ไม่พบใบหน้าในภาพทดสอบ");
        return;
      }

      // สร้างพนักงานทดสอบ
      await this.storage.initTestEmployee(
        "ทรี",
        base64Image,
        detection.descriptor,
      );
      console.log('[EMPLOYEES] Test employee "ทรี" created successfully');

      // Reload list
      await this.loadEmployees();

      alert('สร้างพนักงานทดสอบ "ทรี" สำเร็จ!');
    } catch (error) {
      console.error("[EMPLOYEES] Error creating test employee:", error);
      alert("เกิดข้อผิดพลาด: " + error);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * แปลง Blob เป็น Base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }
  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  employeesWithPhoto(): number {
    return this.employees.filter((e) => e.photoPath).length;
  }
}
