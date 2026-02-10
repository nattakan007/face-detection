import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { FaceDetectionService } from "../../services/face-detection.service";
import { StorageService } from "../../services/storage.service";
import { PermissionService } from "../../services/permission.service";
import { SettingsService } from "../../services/settings.service";
import { UserProfile } from "../../services/storage.service";
import {
  LoadingController,
  ToastController,
  AlertController,
} from "@ionic/angular";

interface User {
  fullName: string;
  email: string;
  department: string;
  faceDescriptor?: number[];
  photoPath?: string;
}

@Component({
  selector: "app-register",
  templateUrl: "./register.page.html",
  styleUrls: ["./register.page.scss"],
})
export class RegisterPage implements OnInit {
  user: User = {
    fullName: "",
    email: "",
    department: "",
  };
  profilePhoto: string | null = null;
  faceDescriptor: number[] | null = null;
  isProcessing = false;
  generatedEmployeeId: string = "";
  capturedConfidence: number = 0;
  isDuplicateFace: boolean = false; // Flag for duplicate face detection

  // Auto-capture settings (loaded from settings service)
  private autoCaptureCooldown = false;
  private AUTO_CAPTURE_THRESHOLD = 0.7; // TinyFaceDetector default (70%)
  private DUPLICATE_THRESHOLD = 0.5; // Will be loaded from settings
  private REGISTRATION_MIN_CONFIDENCE = 0.7; // Will be loaded from settings

  constructor(
    private router: Router,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private permissionService: PermissionService,
    private settingsService: SettingsService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {}

  ngOnInit() {
    this.generateEmployeeId();
    this.loadSettings();
  }

  /**
   * Load settings from settings service
   */
  private async loadSettings() {
    try {
      const faceSettings =
        await this.settingsService.getFaceDetectionSettings();
      this.AUTO_CAPTURE_THRESHOLD = faceSettings.autoCaptureThresholdRegister;
      this.DUPLICATE_THRESHOLD = faceSettings.duplicateThreshold;
      this.REGISTRATION_MIN_CONFIDENCE = faceSettings.registrationMinConfidence;
    } catch (error) {
      console.error("Error loading settings:", error);
      // Keep defaults if error
    }
  }

  async generateEmployeeId() {
    // Get current registered users count
    const users = await this.storage.getAllUsers();
    const nextNumber = (users.length + 1).toString().padStart(4, "0");
    this.generatedEmployeeId = `EMP${nextNumber}`;
  }

  /**
   * Handle face detection events from live camera (both auto-capture and manual)
   */
  async onFaceAutoCapture(event: any) {
    // Skip if already captured or processing
    if (this.profilePhoto || this.isProcessing) {
      return;
    }

    // If imageDataUrl is provided, it means photo was captured
    if (event.imageDataUrl) {
      await this.processPhoto(event.imageDataUrl);
      return;
    }

    // Otherwise, this is a real-time detection event for auto-capture
    if (this.autoCaptureCooldown) {
      return;
    }

    // Check if confidence is high enough for auto-capture
    if (event.confidence >= this.AUTO_CAPTURE_THRESHOLD && event.detected) {
      this.autoCaptureCooldown = true;

      // Wait a moment for stable detection before capturing
      setTimeout(async () => {
        if (!this.profilePhoto) {
          await this.captureFromLiveCamera();
        }
        // Reset cooldown after 2 seconds
        setTimeout(() => {
          this.autoCaptureCooldown = false;
        }, 2000);
      }, 500);
    }
  }

  /**
   * Handle manual photo capture from live camera
   */
  onPhotoCaptured(imageDataUrl: string) {
    // This is called when user manually captures
    this.processPhoto(imageDataUrl);
  }

  /**
   * Capture photo from the live camera component
   */
  private async captureFromLiveCamera() {
    this.isProcessing = true;

    try {
      // Take photo using face detection service
      const imageDataUrl = await this.faceDetection.takePhoto();
      if (imageDataUrl) {
        await this.processPhoto(imageDataUrl);
      }
    } catch (error: any) {
      console.error("Auto-capture error:", error);
      const toast = await this.toastCtrl.create({
        message: "เกิดข้อผิดพลาดในการถ่ายภาพ กรุณาลองใหม่",
        color: "danger",
        duration: 2000,
      });
      await toast.present();
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process captured photo - detect face and store descriptor
   */
  private async processPhoto(imageDataUrl: string) {
    const loading = await this.loadingCtrl.create({
      message: "กำลังตรวจจับใบหน้า...",
      duration: 10000,
    });
    await loading.present();

    try {
      // Detect face
      const detection = await this.faceDetection.detectFace(imageDataUrl);

      if (!detection.detected) {
        const toast = await this.toastCtrl.create({
          message: detection.error || "ไม่พบใบหน้า กรุณาลองใหม่",
          color: "warning",
          duration: 2000,
        });
        await toast.present();
        return;
      }

      // Require minimum confidence for registration (from settings)
      if (detection.confidence < this.REGISTRATION_MIN_CONFIDENCE) {
        const minPercent = Math.round(this.REGISTRATION_MIN_CONFIDENCE * 100);
        const toast = await this.toastCtrl.create({
          message: `ความชัดเจน ${Math.round(
            detection.confidence * 100,
          )}% ไม่เพียงพอ (ต้องการ ${minPercent}%) กรุณาถ่ายใหม่`,
          color: "warning",
          duration: 2000,
        });
        await toast.present();
        return;
      }

      // Success! Save photo and descriptor
      this.profilePhoto = imageDataUrl;
      this.faceDescriptor = detection.descriptor;
      this.capturedConfidence = Math.round(detection.confidence * 100);

      // Show success message (duplicate check will be done when user clicks Register button)
      const toast = await this.toastCtrl.create({
        message: `บันทึกใบหน้าสำเร็จ! (${this.capturedConfidence}%)`,
        color: "success",
        duration: 2000,
      });
      await toast.present();
    } catch (error: any) {
      console.error("Photo processing error:", error);
      const toast = await this.toastCtrl.create({
        message: "เกิดข้อผิดพลาด กรุณาลองใหม่",
        color: "danger",
        duration: 2000,
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }

  // Keep legacy method for compatibility
  async takeProfilePhoto() {
    await this.captureFromLiveCamera();
  }

  retakePhoto() {
    this.profilePhoto = null;
    this.faceDescriptor = null;
    this.capturedConfidence = 0;
    this.isDuplicateFace = false;
  }

  canRegister(): boolean {
    return !!(
      this.user.fullName &&
      this.generatedEmployeeId &&
      this.profilePhoto &&
      this.faceDescriptor &&
      !this.isDuplicateFace
    );
  }

  async register() {
    if (!this.canRegister()) return;

    const alert = await this.alertCtrl.create({
      header: "ยืนยันการลงทะเบียน",
      message: `คุณต้องการลงทะเบียนให้กับ ${this.user.fullName} (${this.generatedEmployeeId}) ใช่หรือไม่?`,
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ยืนยัน",
          handler: async () => {
            await this.processRegistration();
          },
        },
      ],
    });
    await alert.present();
  }

  async processRegistration() {
    const loading = await this.loadingCtrl.create({
      message: "กำลังตรวจสอบข้อมูล...",
    });
    await loading.present();

    try {
      // Check for duplicate face
      const isDuplicate = await this.checkDuplicateFace(this.faceDescriptor!);

      if (isDuplicate) {
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: "พบข้อมูลซ้ำ",
          message:
            "ใบหน้านี้ถูกลงทะเบียนในระบบแล้ว กรุณาตรวจสอบข้อมูลหรือลองถ่ายภาพใหม่",
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

      loading.message = "กำลังบันทึกข้อมูล...";

      // Validate email format if provided
      if (this.user.email && !this.isValidEmail(this.user.email)) {
        await loading.dismiss();
        const toast = await this.toastCtrl.create({
          message: "รูปแบบอีเมลไม่ถูกต้อง",
          color: "warning",
          duration: 2000,
        });
        await toast.present();
        return;
      }

      // Create user profile
      const userProfile = {
        id: Date.now().toString(),
        name: this.user.fullName,
        employeeId: this.generatedEmployeeId,
        faceDescriptor: this.faceDescriptor!,
        createdAt: Date.now(),
        fullName: this.user.fullName,
        email: this.user.email,
        department: this.user.department,
        photoPath: this.profilePhoto || undefined,
      };

      // Save to storage
      await this.storage.saveUserProfile(userProfile);

      // Sync จะทำงานตามรอบเวลาผ่าน SyncSchedulerService (ทุก 5 นาที)

      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: "ลงทะเบียนสำเร็จ!",
        color: "success",
        duration: 3000,
      });
      await toast.present();

      // Navigate back to admin dashboard (stay in admin mode)
      this.router.navigate(["/admin-dashboard"]);
    } catch (error: any) {
      await loading.dismiss();

      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: error.message || "ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่",
        buttons: ["ตกลง"],
      });
      await alert.present();
    }
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if face descriptor matches any existing user
   */
  private async checkDuplicateFace(faceDescriptor: number[]): Promise<boolean> {
    const allUsers = await this.storage.getAllUsers();

    for (const user of allUsers) {
      const distance = this.faceDetection.getEuclideanDistance(
        faceDescriptor,
        user.faceDescriptor,
      );

      if (distance < this.DUPLICATE_THRESHOLD) {
        console.log(
          `Duplicate face found: ${user.name} (distance: ${distance.toFixed(
            3,
          )})`,
        );
        return true;
      }
    }

    return false;
  }

  cancel() {
    this.router.navigate(["/admin-dashboard"]);
  }
}
