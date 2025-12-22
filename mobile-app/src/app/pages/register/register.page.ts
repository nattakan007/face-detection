import { Component, OnInit, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { FaceDetectionService } from "../../services/face-detection.service";
import { StorageService } from "../../services/storage.service";
import { PermissionService } from "../../services/permission.service";
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

  // Auto-capture settings
  private autoCaptureCooldown = false;
  private readonly AUTO_CAPTURE_THRESHOLD = 0.85; // 85% confidence for auto-capture

  constructor(
    private router: Router,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private permissionService: PermissionService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  ngOnInit() {
    this.generateEmployeeId();
  }

  async generateEmployeeId() {
    // Get current registered users count
    const users = await this.storage.getAllUsers();
    const nextNumber = (users.length + 1).toString().padStart(4, "0");
    this.generatedEmployeeId = `EMP${nextNumber}`;
  }

  /**
   * Handle auto-capture when face is detected with high confidence
   */
  async onFaceAutoCapture(event: any) {
    // Skip if already captured, processing, or in cooldown
    if (this.profilePhoto || this.isProcessing || this.autoCaptureCooldown) {
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

      // Require >80% confidence for registration
      if (detection.confidence < 0.8) {
        const toast = await this.toastCtrl.create({
          message: `ความชัดเจน ${Math.round(
            detection.confidence * 100
          )}% ไม่เพียงพอ กรุณาถ่ายใหม่`,
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

      // Check for duplicate face immediately
      this.isDuplicateFace = await this.checkDuplicateFace(
        detection.descriptor!
      );

      if (this.isDuplicateFace) {
        const toast = await this.toastCtrl.create({
          message: "ใบหน้านี้ถูกลงทะเบียนแล้ว กรุณาถ่ายใหม่",
          color: "warning",
          duration: 3000,
        });
        await toast.present();
      } else {
        const toast = await this.toastCtrl.create({
          message: `บันทึกใบหน้าสำเร็จ! (${this.capturedConfidence}%)`,
          color: "success",
          duration: 2000,
        });
        await toast.present();
      }
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

      await loading.dismiss();

      const toast = await this.toastCtrl.create({
        message: "ลงทะเบียนสำเร็จ!",
        color: "success",
        duration: 3000,
      });
      await toast.present();

      // Navigate to scan page
      this.router.navigate(["/scan"]);
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
   * Check if face descriptor matches any existing user
   */
  private async checkDuplicateFace(faceDescriptor: number[]): Promise<boolean> {
    const allUsers = await this.storage.getAllUsers();
    const DUPLICATE_THRESHOLD = 0.6; // Same as face matching threshold

    for (const user of allUsers) {
      const d1 = new Float32Array(faceDescriptor);
      const d2 = new Float32Array(user.faceDescriptor);
      const distance = (window as any).faceapi.euclideanDistance(d1, d2);

      if (distance < DUPLICATE_THRESHOLD) {
        console.log(
          `Duplicate face found: ${user.name} (distance: ${distance.toFixed(
            3
          )})`
        );
        return true;
      }
    }

    return false;
  }

  cancel() {
    this.router.navigate(["/scan"]);
  }
}
