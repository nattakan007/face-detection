import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  Output,
  EventEmitter,
  Input,
} from "@angular/core";
import { LiveCameraService } from "../../services/live-camera.service";
import { FaceDetectionService } from "../../services/face-detection.service";
import { PermissionService } from "../../services/permission.service";
import { AlertController } from "@ionic/angular";

@Component({
  selector: "app-live-camera",
  templateUrl: "./live-camera.component.html",
  styleUrls: ["./live-camera.component.scss"],
})
export class LiveCameraComponent implements OnInit, OnDestroy {
  @ViewChild("video", { static: false })
  videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild("canvas", { static: false })
  canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild("overlayCanvas", { static: false })
  overlayCanvasElement!: ElementRef<HTMLCanvasElement>;

  @Output() onFaceDetected = new EventEmitter<any>();
  @Output() onCapture = new EventEmitter<string>();
  @Output() onMatchError = new EventEmitter<string>(); // Emit when face doesn't match
  @Output() onNoFace = new EventEmitter<void>(); // Emit when no face detected

  @Input() mode: "scan" | "register" = "scan"; // Mode to control popup behavior

  isScanning = false;
  isCameraActive = false;
  detectionResults: any = null;
  errorMessage: string = "";

  // Real-time detection state
  private detectionInterval: any = null;
  isRealTimeDetecting = false;
  realTimeDetection: any = null;
  lastDescriptor: number[] | null = null;

  // Match result state for visual feedback
  matchStatus: "none" | "matched" | "not-matched" | "no-face" = "none";
  matchedEmployeeName: string = "";
  matchSimilarity: number = 0;
  isPaused: boolean = false; // Control auto-scan pause

  // Auto-capture state
  private lastAutoCaptureTime: number = 0;
  private readonly AUTO_CAPTURE_COOLDOWN = 3000; // 3 seconds
  private readonly AUTO_CAPTURE_THRESHOLD = 0.98; // 98% confidence

  constructor(
    private liveCameraService: LiveCameraService,
    private faceDetection: FaceDetectionService,
    private permissionService: PermissionService,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    // Don't auto-start camera, wait for user action
  }

  async startCamera() {
    try {
      // For mobile devices, try to prompt for permission directly
      if ("permissions" in navigator) {
        try {
          const result = await navigator.permissions.query({
            name: "camera" as PermissionName,
          });
          if (result.state === "prompt") {
            console.log("Camera permission will be prompted");
          }
        } catch (err) {
          // Some browsers don't support permissions API for camera
          console.log(
            "Permissions API not available, proceeding with camera request"
          );
        }
      }

      await this.liveCameraService.startCamera(
        this.videoElement.nativeElement,
        "user"
      ); // 'user' = front camera
      this.isCameraActive = true;
      this.errorMessage = "";

      // Start real-time face detection
      this.startRealTimeDetection();
    } catch (error: any) {
      console.error("Failed to start camera:", error);

      // More descriptive error messages
      if (error.message.includes("permission denied")) {
        this.errorMessage = "กรุณาอนุญาตให้ใช้กล้องในการตั้งค่าของแอปพลิเคชัน";
      } else if (error.message.includes("not found")) {
        this.errorMessage =
          "ไม่พบกล้องในอุปกรณ์ของคุณ กรุณาตรวจสอบว่ากล้องทำงานได้";
      } else if (error.message.includes("already in use")) {
        this.errorMessage =
          "กล้องกำลังถูกใช้งานโดยแอปพลิเคชันอื่น กรุณาปิดแอปอื่นแล้วลองใหม่";
      } else {
        this.errorMessage = `ไม่สามารถเปิดกล้องได้: ${error.message}`;
      }
    }
  }

  stopCamera() {
    this.stopRealTimeDetection();
    this.liveCameraService.stopCamera();
    this.isCameraActive = false;
  }

  /**
   * Start continuous real-time face detection
   */
  private startRealTimeDetection() {
    if (this.detectionInterval) return;

    this.isRealTimeDetecting = true;

    // Run detection every 200ms for smooth feedback without overwhelming CPU
    this.detectionInterval = setInterval(async () => {
      if (!this.isCameraActive || !this.videoElement?.nativeElement) return;

      try {
        const video = this.videoElement.nativeElement;
        const detection = await this.faceDetection.detectFaceFromVideo(video);

        this.realTimeDetection = detection;

        // Draw overlay on canvas
        if (this.overlayCanvasElement?.nativeElement) {
          this.faceDetection.drawFaceOverlay(
            this.overlayCanvasElement.nativeElement,
            video,
            detection,
            true // mirrored for front camera
          );
        }

        // Store descriptor for quick capture
        if (detection.detected && detection.descriptor) {
          this.lastDescriptor = detection.descriptor;
        }

        // Auto-capture when confidence reaches threshold
        if (
          detection.detected &&
          detection.confidence &&
          detection.confidence >= this.AUTO_CAPTURE_THRESHOLD &&
          !this.isPaused
        ) {
          const now = Date.now();
          if (now - this.lastAutoCaptureTime >= this.AUTO_CAPTURE_COOLDOWN) {
            this.lastAutoCaptureTime = now;
            this.isPaused = true; // Stop scanning after successful capture
            console.log(
              `Auto-capturing at ${(detection.confidence * 100).toFixed(
                1
              )}% confidence`
            );
            await this.capturePhoto();
          }
        }
      } catch (error) {
        console.error("Real-time detection error:", error);
      }
    }, 200);
  }

  /**
   * Stop real-time detection
   */
  private stopRealTimeDetection() {
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }
    this.isRealTimeDetecting = false;
    this.realTimeDetection = null;
    this.lastDescriptor = null;
  }

  /**
   * Pause detection (public method for parent component)
   */
  pauseDetection() {
    this.isPaused = true;
    this.stopRealTimeDetection();
  }

  /**
   * Resume detection (public method for parent component)
   */
  resumeDetection() {
    this.isPaused = false;
    this.matchStatus = "none";
    this.matchedEmployeeName = "";
    this.matchSimilarity = 0;
    this.detectionResults = null;
    this.errorMessage = "";
    if (this.isCameraActive) {
      this.startRealTimeDetection();
    }
  }

  /**
   * Reset match status and restart scanning
   */
  resetAndRescan() {
    this.resumeDetection();
  }

  async startScanning() {
    if (!this.isCameraActive) {
      // First time clicking - check permission and start camera
      this.isScanning = true; // Show loading state

      // Check camera permission first
      const hasPermission =
        await this.permissionService.requestCameraPermission();

      if (!hasPermission) {
        // Show alert to guide user
        const alert = await this.alertCtrl.create({
          header: "ต้องการสิทธิ์การใช้กล้อง",
          message:
            "แอปนี้ต้องการสิทธิ์ในการใช้งานกล้องเพื่อทำการสแกนใบหน้า กรุณาอนุญาตให้ใช้กล้อง",
          buttons: [
            {
              text: "ยกเลิก",
              role: "cancel",
            },
            {
              text: "ตั้งค่า",
              handler: () => {
                this.permissionService.openAppSettings();
              },
            },
          ],
        });
        await alert.present();

        this.isScanning = false;
        return;
      }

      await this.startCamera();
      this.isScanning = false; // Reset scanning state
    } else {
      // Camera is already active - capture and detect
      await this.capturePhoto();
    }
  }

  async capturePhoto() {
    if (!this.isCameraActive) return;

    try {
      const imageData = this.liveCameraService.captureFrame();
      this.onCapture.emit(imageData);

      // Perform face detection on captured frame
      await this.detectFace(imageData);
    } catch (error) {
      console.error("Error capturing photo:", error);
      this.errorMessage = "ไม่สามารถถ่ายภาพได้";
    }
  }

  async detectFace(imageDataUrl: string) {
    this.isScanning = true;
    this.detectionResults = null;

    try {
      const result = await this.faceDetection.detectFace(imageDataUrl);

      if (!result.detected) {
        // No face detected - show popup and reset
        this.matchStatus = "no-face";
        this.onNoFace.emit();

        const alert = await this.alertCtrl.create({
          header: "ไม่พบใบหน้า",
          message: "กรุณาหันหน้าเข้าหากล้องแล้วลองใหม่",
          buttons: [
            {
              text: "ตกลง",
              handler: () => {
                this.fullReset();
              },
            },
          ],
        });
        await alert.present();
        return;
      }

      this.detectionResults = {
        detected: result.detected,
        confidence: result.confidence,
        message: `พบใบหน้า (${(result.confidence * 100).toFixed(1)}%)`,
      };

      if (result.warning) {
        this.detectionResults.message = result.warning;
      }

      // Check if face matches registered user
      if (result.detected && result.descriptor) {
        const identification = await this.faceDetection.identifyFace(
          result.descriptor
        );

        if (identification.identified) {
          // Match found - emit event then show popup
          this.matchStatus = "matched";
          this.matchedEmployeeName = identification.faceData.name;
          this.matchSimilarity = (identification.similarity || 0) * 100;

          this.onFaceDetected.emit({
            detected: true,
            user: identification.faceData,
            confidence: result.confidence,
            similarity: identification.similarity || 0,
          });

          // Show success popup then full reset
          const alert = await this.alertCtrl.create({
            header: "พบข้อมูลพนักงาน",
            message: `ชื่อ: ${identification.faceData.name}\nรหัส: ${
              identification.faceData.employeeId || "-"
            }\nความเหมือน: ${this.matchSimilarity.toFixed(1)}%`,
            buttons: [
              {
                text: "ตกลง",
                handler: () => {
                  this.fullReset();
                },
              },
            ],
          });
          await alert.present();
        } else {
          // No match - only show popup in scan mode (not registration)
          this.matchStatus = "not-matched";
          this.onMatchError.emit("ไม่พบข้อมูลพนักงานในระบบ");

          if (this.mode === "scan") {
            const alert = await this.alertCtrl.create({
              header: "ไม่พบข้อมูลพนักงาน",
              message:
                "ใบหน้านี้ไม่ตรงกับพนักงานในระบบ กรุณาลงทะเบียนก่อนใช้งาน",
              buttons: [
                {
                  text: "ตกลง",
                  handler: () => {
                    this.fullReset();
                  },
                },
              ],
            });
            await alert.present();
          }
        }
      }
    } catch (error) {
      console.error("Face detection error:", error);
      this.matchStatus = "no-face";

      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถตรวจจับใบหน้าได้ กรุณาลองใหม่",
        buttons: [
          {
            text: "ตกลง",
            handler: () => {
              this.fullReset();
            },
          },
        ],
      });
      await alert.present();
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Full reset - stop camera and return to initial state
   */
  fullReset() {
    this.stopCamera();
    this.matchStatus = "none";
    this.matchedEmployeeName = "";
    this.matchSimilarity = 0;
    this.detectionResults = null;
    this.errorMessage = "";
    this.isPaused = false;
    this.isCameraActive = false;
    // Camera stays off - user must press button to start again
  }

  ngOnDestroy() {
    this.stopCamera();
  }
}
