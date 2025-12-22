import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { FaceDetectionService } from "../../services/face-detection.service";
import { StorageService } from "../../services/storage.service";
import { Geolocation, Position } from "@capacitor/geolocation";
import {
  LoadingController,
  ToastController,
  AlertController,
} from "@ionic/angular";
import { LiveCameraComponent } from "../../components/live-camera/live-camera.component";

@Component({
  selector: "app-manual-checkin",
  templateUrl: "./manual-checkin.page.html",
  styleUrls: ["./manual-checkin.page.scss"],
})
export class ManualCheckinPage implements OnInit {
  @ViewChild("liveCamera") liveCamera!: LiveCameraComponent;

  employeeName: string = "";
  department: string = "";
  capturedPhoto: string | null = null;
  isProcessing: boolean = false;
  lastAttendance: any = null;

  constructor(
    private router: Router,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    this.lastAttendance = await this.getLastAttendance();
  }

  async getLastAttendance() {
    const todayRecords = await this.storage.getTodayAttendance();
    return todayRecords.length > 0 ? todayRecords[0] : null;
  }

  getNextAction(): string {
    if (!this.lastAttendance) return "เข้างาน";
    return this.lastAttendance.type === "check-in" ? "ออกงาน" : "เข้างาน";
  }

  /**
   * Handle photo captured from live camera
   */
  async onPhotoCaptured(imageDataUrl: string) {
    if (!this.employeeName.trim()) {
      const toast = await this.toastCtrl.create({
        message: "กรุณากรอกชื่อก่อนถ่ายรูป",
        color: "warning",
        duration: 2000,
      });
      await toast.present();
      return;
    }

    this.capturedPhoto = imageDataUrl;
    await this.processCheckin(imageDataUrl);
  }

  /**
   * Handle face detected event (auto-capture when face detected)
   */
  async onFaceAutoCapture(event: any) {
    // Skip if already processing or no name entered
    if (this.isProcessing || !this.employeeName.trim()) {
      return;
    }

    // Auto capture when confidence is high enough
    if (event.confidence >= 0.8 && event.detected) {
      // Capture from live camera
      if (this.liveCamera) {
        await this.liveCamera.capturePhoto();
      }
    }
  }

  /**
   * Process check-in with captured photo (NO FACE COMPARISON)
   */
  private async processCheckin(imageDataUrl: string) {
    this.isProcessing = true;

    const loading = await this.loadingCtrl.create({
      message: "กำลังบันทึกข้อมูล...",
    });
    await loading.present();

    try {
      // Simple face detection for quality check only (no comparison)
      const detection = await this.faceDetection.detectFace(imageDataUrl);

      if (!detection.detected) {
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: "ไม่พบใบหน้า",
          message: "กรุณาถ่ายภาพใหม่ให้มีใบหน้าอยู่ในกรอบ",
          buttons: [
            {
              text: "ลองใหม่",
              handler: () => {
                this.retakePhoto();
              },
            },
          ],
        });
        await alert.present();
        return;
      }

      // Get location
      let location;
      try {
        const position: Position = await Geolocation.getCurrentPosition();
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
      } catch (error) {
        console.warn("Could not get location:", error);
      }

      // Determine check-in or check-out
      const now = new Date();
      const type =
        this.lastAttendance?.type === "check-in" ? "check-out" : "check-in";

      // Save attendance record WITHOUT face comparison
      const record = await this.storage.saveAttendance({
        type,
        timestamp: now.getTime(),
        date: now.toLocaleDateString("th-TH"),
        time: now.toLocaleTimeString("th-TH"),
        location,
        employeeId: "MANUAL-" + Date.now(),
        employeeName: this.employeeName.trim(),
        employeeDepartment: this.department.trim() || "ไม่ระบุ",
        photoDataUrl: imageDataUrl,
        confidence: detection.confidence,
      });

      await loading.dismiss();

      // Show success
      const successAlert = await this.alertCtrl.create({
        header: type === "check-in" ? "เข้างานสำเร็จ" : "ออกงานสำเร็จ",
        message: `บันทึกข้อมูล${
          type === "check-in" ? "เข้างาน" : "ออกงาน"
        }ของ ${this.employeeName} เรียบร้อยแล้ว`,
        buttons: [
          {
            text: "ตกลง",
            handler: () => {
              this.router.navigate(["/scan"]);
            },
          },
        ],
      });
      await successAlert.present();
    } catch (error: any) {
      await loading.dismiss();
      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: error.message || "ไม่สามารถบันทึกได้ กรุณาลองใหม่",
        buttons: ["ตกลง"],
      });
      await alert.present();
    } finally {
      this.isProcessing = false;
    }
  }

  retakePhoto() {
    this.capturedPhoto = null;
  }

  cancel() {
    this.router.navigate(["/scan"]);
  }
}
