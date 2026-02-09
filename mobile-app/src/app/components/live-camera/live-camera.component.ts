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
import { SettingsService } from "../../services/settings.service";
import { StorageService } from "../../services/storage.service";
import { AlertController, Platform, LoadingController } from "@ionic/angular";

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
  @Output() onNoFaceTimeout = new EventEmitter<void>(); // Emit when no face for 3 seconds

  @Input() mode: "scan" | "register" | "check-in" | "check-out" = "scan"; // Mode to control popup behavior

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

  // Face stability detection
  private facePositionHistory: { x: number; y: number }[] = [];
  private readonly STABLE_FRAMES_REQUIRED = 3; // ต้องนิ่ง 3 เฟรม (~0.6 วินาที)
  private readonly MAX_MOVEMENT_THRESHOLD = 20; // pixel
  private readonly CENTER_TOLERANCE = 100; // ระยะห่างจากกลางจอที่ยอมรับได้
  captureProgress: number = 0; // Progress bar 0-1 สำหรับแสดงความคืบหน้า
  isPaused: boolean = false; // Control auto-scan pause
  scanCompleted: boolean = false; // Scan completed - camera stopped, show restart button

  // No face timeout - กลับหน้าแรกเมื่อไม่พบหน้า 3 วินาที
  private noFaceTimeoutId: any = null;
  private lastFaceDetectedTime: number = Date.now();
  private readonly NO_FACE_TIMEOUT = 3000; // 3 วินาที

  // Auto-capture state (loaded from settings)
  private lastAutoCaptureTime: number = 0;
  private autoCaptureThreshold: number = 0.9; // Will be overwritten by settings
  private autoCaptureCooldown: number = 2000; // Will be overwritten by settings

  // Test mode - show test button on browser only
  showTestButton = false;

  constructor(
    private liveCameraService: LiveCameraService,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private permissionService: PermissionService,
    private settingsService: SettingsService,
    private alertCtrl: AlertController,
    private platform: Platform,
    private loadingCtrl: LoadingController,
  ) {}

  async ngOnInit() {
    // Load settings first - MUST complete before starting camera/detection
    await this.loadSettings();
    console.log(
      `[LIVE-CAMERA] Settings loaded: autoCaptureThreshold=${this.autoCaptureThreshold}, cooldown=${this.autoCaptureCooldown}ms`,
    );

    // Show test button only on browser (not on mobile device)
    this.showTestButton = !this.platform.is("capacitor");
    console.log("[LIVE-CAMERA] Test button visible:", this.showTestButton);

    // Auto-start camera when component loads (for auto-scan from scan page)
    await this.startCamera();
  }

  /**
   * Load auto-capture settings
   */
  private async loadSettings() {
    try {
      const settings = await this.settingsService.getFaceDetectionSettings();
      if (settings && settings.autoCaptureThresholdScan !== undefined) {
        this.autoCaptureThreshold = settings.autoCaptureThresholdScan;
      } else {
        // If settings not found, use a reasonable default instead of 0.98
        this.autoCaptureThreshold = 0.8;
      }
      if (settings && settings.autoCaptureCooldown !== undefined) {
        this.autoCaptureCooldown = settings.autoCaptureCooldown;
      }
      console.log(
        `[LIVE-CAMERA] loadSettings() => autoCaptureThreshold=${this.autoCaptureThreshold}, cooldown=${this.autoCaptureCooldown}`,
      );
    } catch (error) {
      console.error("Error loading settings:", error);
      // Use reasonable defaults if error (not 0.98 which is too strict)
      this.autoCaptureThreshold = 0.9;
      this.autoCaptureCooldown = 2000;
    }
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
            "Permissions API not available, proceeding with camera request",
          );
        }
      }

      await this.liveCameraService.startCamera(
        this.videoElement.nativeElement,
        "user",
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
    console.log(
      "[LIVE-CAMERA] 🟢 Starting real-time detection loop (interval: 200ms)",
    );
    console.log(
      `[LIVE-CAMERA] ⚙️ autoCaptureThreshold=${this.autoCaptureThreshold}, autoCaptureCooldown=${this.autoCaptureCooldown}ms`,
    );
    this.detectionInterval = setInterval(async () => {
      if (!this.isCameraActive || !this.videoElement?.nativeElement) return;

      try {
        const video = this.videoElement.nativeElement;
        const detection = await this.faceDetection.detectFaceFromVideo(video);

        this.realTimeDetection = detection;

        // ตรวจสอบว่าพบใบหน้าหรือไม่
        if (detection.detected) {
          // พบใบหน้า - รีเซ็ต timeout
          this.lastFaceDetectedTime = Date.now();
          this.clearNoFaceTimeout();
          console.log(
            `[LIVE-CAMERA] 👤 Face detected - confidence: ${(
              detection.confidence * 100
            ).toFixed(1)}%, threshold: ${(
              this.autoCaptureThreshold * 100
            ).toFixed(1)}%, isPaused: ${this.isPaused}, scanCompleted: ${
              this.scanCompleted
            }`,
          );
        } else {
          // ไม่พบใบหน้า - เริ่ม timeout ถ้ายังไม่มี
          this.startNoFaceTimeout();
        }

        // Draw overlay on canvas
        if (this.overlayCanvasElement?.nativeElement) {
          await this.faceDetection.drawFaceOverlay(
            this.overlayCanvasElement.nativeElement,
            video,
            detection,
            true, // mirrored for front camera
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
          detection.confidence >= this.autoCaptureThreshold &&
          !this.isPaused &&
          !this.scanCompleted
        ) {
          const now = Date.now();
          const cooldownReady =
            now - this.lastAutoCaptureTime >= this.autoCaptureCooldown;
          console.log(
            `[LIVE-CAMERA] 🎯 Auto-capture candidate - confidence: ${(
              detection.confidence * 100
            ).toFixed(1)}%, cooldownReady: ${cooldownReady}`,
          );
          if (cooldownReady) {
            this.lastAutoCaptureTime = now;
            this.isPaused = true; // Stop scanning after successful capture
            console.log(
              `[LIVE-CAMERA] 📸 AUTO-CAPTURING at ${(
                detection.confidence * 100
              ).toFixed(1)}% confidence`,
            );
            // Stop real-time detection to prevent duplicate captures
            this.stopRealTimeDetection();
            // Call capturePhoto BEFORE setting scanCompleted (capturePhoto checks this flag)
            await this.capturePhoto(true); // true = auto-capture, skip stability check
            this.scanCompleted = true; // Mark scan as completed AFTER capture
          }
        } else if (detection.detected && detection.confidence) {
          // Log why auto-capture didn't trigger
          if (detection.confidence < this.autoCaptureThreshold) {
            // Only log occasionally to avoid spam
            if (Math.random() < 0.1) {
              console.log(
                `[LIVE-CAMERA] ⏳ Confidence too low: ${(
                  detection.confidence * 100
                ).toFixed(1)}% < ${(this.autoCaptureThreshold * 100).toFixed(
                  1,
                )}%`,
              );
            }
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
    this.clearNoFaceTimeout();
  }

  /**
   * เริ่ม timeout เมื่อไม่พบใบหน้า
   */
  private startNoFaceTimeout() {
    // ถ้ามี timeout อยู่แล้ว ไม่ต้องสร้างใหม่
    if (this.noFaceTimeoutId) {
      return;
    }

    // เริ่ม timeout ใหม่
    this.noFaceTimeoutId = setTimeout(() => {
      // หลัง 3 วินาที ยังไม่พบใบหน้า - กลับหน้าแรก
      this.onNoFaceTimeout.emit();
      this.stopCamera();
    }, this.NO_FACE_TIMEOUT);
  }

  /**
   * ยกเลิก timeout
   */
  private clearNoFaceTimeout() {
    if (this.noFaceTimeoutId) {
      clearTimeout(this.noFaceTimeoutId);
      this.noFaceTimeoutId = null;
    }
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

  async capturePhoto(isAutoCapture: boolean = false) {
    console.log(
      "[LIVE-CAMERA] capturePhoto() called - Mode:",
      this.mode,
      "Camera active:",
      this.isCameraActive,
      "Scan completed:",
      this.scanCompleted,
      "isAutoCapture:",
      isAutoCapture,
    );

    if (!this.isCameraActive) {
      console.log("[LIVE-CAMERA] Camera not active, aborting capture");
      return;
    }

    // Prevent duplicate captures after scan completed
    if (this.scanCompleted) {
      console.log(
        "[LIVE-CAMERA] Scan already completed, ignoring capture request",
      );
      return;
    }

    try {
      console.log("[LIVE-CAMERA] Capturing frame from video...");
      const imageData = this.liveCameraService.captureFrame();
      console.log(
        "[LIVE-CAMERA] Frame captured, image size:",
        imageData?.length || 0,
        "bytes",
      );

      // In register mode, just emit the image and let parent handle face detection
      // This prevents double-processing and blocking alert popups
      if (this.mode === "register") {
        console.log(
          "[LIVE-CAMERA] Register mode - emitting to parent without detection",
        );
        this.onFaceDetected.emit({
          imageDataUrl: imageData,
          detection: null, // Parent will detect the face
        });
        this.onCapture.emit(imageData);
        return;
      }

      // In scan mode, emit and also perform face detection
      console.log("[LIVE-CAMERA] Scan mode - emitting capture event");
      this.onCapture.emit(imageData);

      console.log("[LIVE-CAMERA] Starting face detection...");
      await this.detectFace(imageData, isAutoCapture);
      console.log("[LIVE-CAMERA] Face detection completed");
    } catch (error) {
      console.error("[LIVE-CAMERA] Error capturing photo:", error);
      this.errorMessage = "ไม่สามารถถ่ายภาพได้";
    }
  }

  async detectFace(imageDataUrl: string, skipStabilityCheck: boolean = false) {
    this.isScanning = true;
    this.detectionResults = null;

    try {
      const result = await this.faceDetection.detectFace(imageDataUrl);

      if (!result.detected) {
        // No face detected - emit event and let parent handle
        this.matchStatus = "no-face";
        this.onNoFace.emit();
        this.facePositionHistory = []; // รีเซ็ตประวัติ

        // In scan mode, don't show popup - let parent navigate
        if (
          this.mode === "check-in" ||
          this.mode === "check-out" ||
          this.mode === "scan"
        ) {
          console.log(
            "[LIVE-CAMERA] No face detected in scan mode - letting parent handle",
          );
          return;
        }

        // Only show popup in register mode
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

      // ตรวจสอบว่าใบหน้าอยู่ตรงกลางจอหรือไม่
      // Skip stability check when called from auto-capture (real-time already validated)
      if (result.box && !skipStabilityCheck) {
        console.log(
          `[LIVE-CAMERA] 🔄 Running stability check (skipStabilityCheck=${skipStabilityCheck})`,
        );
        const box = result.box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;

        const videoCenterX = this.videoElement.nativeElement.videoWidth / 2;
        const videoCenterY = this.videoElement.nativeElement.videoHeight / 2;

        const distanceFromCenter = Math.sqrt(
          Math.pow(centerX - videoCenterX, 2) +
            Math.pow(centerY - videoCenterY, 2),
        );

        console.log(
          `[LIVE-CAMERA] 📍 Face center distance from screen center: ${distanceFromCenter.toFixed(
            0,
          )}px (tolerance: ${this.CENTER_TOLERANCE}px)`,
        );

        // ถ้าหน้าไม่อยู่ตรงกลาง
        if (distanceFromCenter > this.CENTER_TOLERANCE) {
          console.log(
            `[LIVE-CAMERA] ❌ Face NOT centered - distance ${distanceFromCenter.toFixed(
              0,
            )} > tolerance ${this.CENTER_TOLERANCE}`,
          );
          this.detectionResults = {
            detected: false,
            confidence: result.confidence,
            message: "⚠️ กรุณาวางใบหน้าตรงกลางกล้อง",
          };
          this.facePositionHistory = []; // รีเซ็ตประวัติ
          this.captureProgress = 0; // รีเซ็ต progress
          return;
        }

        // บันทึกตำแหน่งใบหน้า
        this.facePositionHistory.push({ x: centerX, y: centerY });

        // เก็บแค่ STABLE_FRAMES_REQUIRED เฟรมล่าสุด
        if (this.facePositionHistory.length > this.STABLE_FRAMES_REQUIRED) {
          this.facePositionHistory.shift();
        }

        // อัปเดต progress bar
        this.captureProgress =
          this.facePositionHistory.length / this.STABLE_FRAMES_REQUIRED;

        // เช็คความนิ่ง
        console.log(
          `[LIVE-CAMERA] 📊 Stability: ${this.facePositionHistory.length}/${
            this.STABLE_FRAMES_REQUIRED
          } frames, progress: ${(this.captureProgress * 100).toFixed(0)}%`,
        );
        if (this.facePositionHistory.length === this.STABLE_FRAMES_REQUIRED) {
          const isStable = this.isFaceStable();

          if (!isStable) {
            console.log(`[LIVE-CAMERA] ⚠️ Face NOT stable enough - resetting`);
            // ไม่นิ่งพอ - รีเซ็ตทั้งหมด
            this.facePositionHistory = [];
            this.captureProgress = 0;
            return;
          }

          console.log(`[LIVE-CAMERA] ✅ Face STABLE - ready to process!`);
          // ถ้านิ่งพอแล้ว แสดงว่าพร้อมถ่ายภาพ - ล้างประวัติเพื่อไม่ให้ถ่ายซ้ำ
          this.facePositionHistory = [];
          this.captureProgress = 1; // เต็ม 100%
        } else {
          // ยังไม่ครบ STABLE_FRAMES_REQUIRED เฟรม - รอเงียบๆ แต่แสดง progress bar
          return; // ยังไม่ให้ประมวลผลต่อ
        }
      }

      if (skipStabilityCheck) {
        console.log(
          `[LIVE-CAMERA] ⚡ Stability check SKIPPED (auto-capture) - proceeding to face identification`,
        );
      }

      this.detectionResults = {
        detected: result.detected,
        confidence: result.confidence,
        message: `✅ พร้อมถ่ายภาพ (${(result.confidence * 100).toFixed(1)}%)`,
      };

      if (result.warning) {
        this.detectionResults.message = result.warning;
      }

      // Check if face matches registered user
      if (result.detected && result.descriptor) {
        console.log(
          `[LIVE-CAMERA] 🔍 Starting face identification (descriptor length: ${result.descriptor.length})...`,
        );
        const identification = await this.faceDetection.identifyFace(
          result.descriptor,
        );
        console.log(
          `[LIVE-CAMERA] 🔍 Identification result:`,
          JSON.stringify({
            identified: identification.identified,
            userName: identification.userName,
            employeeId: identification.employeeId,
            similarity: identification.similarity,
            message: identification.message,
          }),
        );

        if (identification.identified) {
          // Match found - emit complete event data for parent to process
          this.matchStatus = "matched";
          this.matchedEmployeeName = identification.faceData.name;
          this.matchSimilarity = (identification.similarity || 0) * 100;
          console.log(
            `[LIVE-CAMERA] ✅ MATCH: ${
              this.matchedEmployeeName
            } (${this.matchSimilarity.toFixed(1)}%) - emitting onFaceDetected`,
          );

          // Emit complete data including imageDataUrl and detection info
          this.onFaceDetected.emit({
            imageDataUrl: imageDataUrl,
            detection: {
              detected: true,
              descriptor: result.descriptor,
              confidence: result.confidence,
              warning: result.warning,
              matched: true, // Flag to indicate match found
              matchedUser: {
                name: identification.faceData.name,
                employeeId: identification.faceData.employeeId || "-",
                similarity: this.matchSimilarity,
              },
            },
          });

          // In both scan and register modes, let parent handle the response
          // Do NOT show alert popup in register mode - it blocks the UI
        } else {
          // No match - emit event for parent to handle
          console.log(
            `[LIVE-CAMERA] ❌ NO MATCH - emitting onFaceDetected with noMatch flag`,
          );
          this.matchStatus = "not-matched";

          // Emit event with detection data even if no match (let parent handle navigation)
          this.onFaceDetected.emit({
            imageDataUrl: imageDataUrl,
            detection: {
              detected: true,
              descriptor: result.descriptor,
              confidence: result.confidence,
              warning: result.warning,
              noMatch: true, // Flag to indicate no match found
              debugInfo: identification.debugInfo,
            },
          });

          // Also emit match error for backward compatibility
          this.onMatchError.emit("ไม่พบข้อมูลพนักงานในระบบ");
        }
      }
    } catch (error) {
      console.error("Face detection error:", error);
      this.matchStatus = "no-face";

      // In scan mode, let parent handle the error
      if (
        this.mode === "check-in" ||
        this.mode === "check-out" ||
        this.mode === "scan"
      ) {
        console.log("[LIVE-CAMERA] Error in scan mode - letting parent handle");
        this.onMatchError.emit("ไม่สามารถตรวจจับใบหน้าได้");
        return;
      }

      // Only show popup in register mode
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
    this.scanCompleted = true; // Mark as completed so user sees restart button
    this.facePositionHistory = []; // รีเซ็ตประวัติตำแหน่งใบหน้า
    // Camera stays off - user must press button to start again
  }

  /**
   * ตรวจสอบว่าใบหน้านิ่งพอหรือยัง
   */
  private isFaceStable(): boolean {
    if (this.facePositionHistory.length < 2) return false;

    for (let i = 1; i < this.facePositionHistory.length; i++) {
      const prev = this.facePositionHistory[i - 1];
      const curr = this.facePositionHistory[i];

      const movement = Math.sqrt(
        Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2),
      );

      if (movement > this.MAX_MOVEMENT_THRESHOLD) {
        return false;
      }
    }

    return true;
  }

  /**
   * Start a new scan - reset everything and start camera
   */
  async startNewScan() {
    this.matchStatus = "none";
    this.matchedEmployeeName = "";
    this.matchSimilarity = 0;
    this.detectionResults = null;
    this.errorMessage = "";
    this.isPaused = false;
    this.scanCompleted = false;
    await this.startCamera();
  }

  /**
   * ใช้ภาพตัวอย่างสำหรับทดสอบ (แสดงเฉพาะบน browser)
   */
  async useTestImage() {
    console.log("[TEST] Using mock test image for mode:", this.mode);

    // สร้างพนักงานทดสอบถ้ายังไม่มี
    await this.ensureTestEmployeeExists();

    // ภาพตัวอย่าง - ลองใช้จาก storage ก่อน
    const testImageBase64 = await this.generateTestImage();

    console.log(
      "[TEST] Mock image generated, size:",
      testImageBase64.length,
      "bytes",
    );

    // เลียนแบบการถ่ายรูป
    if (this.mode === "scan") {
      console.log("[TEST] Scan mode - emitting capture and detecting face");
      this.onCapture.emit(testImageBase64);
      await this.detectFace(testImageBase64);
    } else if (this.mode === "register") {
      console.log("[TEST] Register mode - emitting to parent");
      this.onFaceDetected.emit({
        imageDataUrl: testImageBase64,
        detection: null, // Parent will detect
      });
      this.onCapture.emit(testImageBase64);
    }
  }

  /**
   * ตรวจสอบและสร้างพนักงานทดสอบถ้ายังไม่มี
   */
  private async ensureTestEmployeeExists(): Promise<void> {
    try {
      const users = await this.storage.getAllUsers();
      const testUser = users.find((u) => u.name === "ทรี");

      if (testUser) {
        console.log('[TEST] Test employee "ทรี" already exists');
        return;
      }

      console.log('[TEST] Creating test employee "ทรี"...');

      // โหลดภาพทดสอบ
      const testImagePath = "assets/test-employee.jpg";
      const response = await fetch(testImagePath);
      const blob = await response.blob();
      const base64Image = await this.blobToBase64(blob);

      // ตรวจจับใบหน้า
      const detection = await this.faceDetection.detectFace(base64Image);

      if (!detection.detected || !detection.descriptor) {
        console.error("[TEST] Cannot detect face in test image");
        return;
      }

      // สร้างพนักงานทดสอบ
      await this.storage.initTestEmployee(
        "ทรี",
        base64Image,
        detection.descriptor,
      );
      console.log('[TEST] Test employee "ทรี" created successfully');
    } catch (error) {
      console.error("[TEST] Error creating test employee:", error);
    }
  }

  /**
   * สร้างภาพทดสอบ - ใช้ภาพจาก storage หรือ placeholder
   */
  private async generateTestImage(): Promise<string> {
    try {
      // ลองใช้ภาพทดสอบจาก local file ก่อน (สำหรับ dev mode)
      const testImagePath = "../../../assets/test-employee.jpg";
      const response = await fetch(testImagePath);
      if (response.ok) {
        const blob = await response.blob();
        const base64 = await this.blobToBase64(blob);
        console.log("[TEST] Using test employee image from assets");
        return base64;
      }
    } catch (error) {
      console.warn("[TEST] Cannot load test image from assets:", error);
    }

    try {
      // ลองดึงภาพจาก registered user คนแรก
      const users = await this.storage.getAllUsers();
      if (users.length > 0 && users[0].photoPath) {
        console.log("[TEST] Using photo from registered user:", users[0].name);
        return users[0].photoPath;
      }
    } catch (error) {
      console.warn("[TEST] Cannot load registered user photo:", error);
    }

    // ถ้าไม่มีภาพใน storage ใช้ placeholder
    console.log("[TEST] No registered users, using placeholder image");
    return this.createPlaceholderImage();
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

  /**
   * สร้างภาพ placeholder สำหรับทดสอบ
   */
  private createPlaceholderImage(): string {
    // สร้าง canvas วาดรูปหน้าง่ายๆ
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d")!;

    // Background
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Face circle
    ctx.fillStyle = "#ffdbac";
    ctx.beginPath();
    ctx.arc(320, 240, 100, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.arc(290, 220, 10, 0, Math.PI * 2);
    ctx.arc(350, 220, 10, 0, Math.PI * 2);
    ctx.fill();

    // Mouth
    ctx.beginPath();
    ctx.arc(320, 260, 30, 0, Math.PI);
    ctx.stroke();

    // Text
    ctx.fillStyle = "#666";
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Mock Test Image", 320, 400);

    return canvas.toDataURL("image/jpeg", 0.8);
  }

  /**
   * ทดสอบด้วยการอัปโหลดรูปภาพ (แสดงเฉพาะบน browser)
   */
  async testWithImageUpload() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      console.log("[LIVE-CAMERA-TEST] Image uploaded:", file.name);

      const loading = await this.loadingCtrl.create({
        message: "กำลังประมวลผลภาพ...",
      });
      await loading.present();

      try {
        // Convert to base64
        const base64Image = await this.fileToBase64(file);
        console.log(
          "[LIVE-CAMERA-TEST] Image converted to base64, size:",
          base64Image.length,
        );

        // Detect face
        const detection = await this.faceDetection.detectFace(base64Image);
        console.log("[LIVE-CAMERA-TEST] Detection result:", detection);

        if (!detection.detected || !detection.descriptor) {
          await loading.dismiss();
          const alert = await this.alertCtrl.create({
            header: "ไม่พบใบหน้า",
            message:
              "ไม่พบใบหน้าในภาพที่อัปโหลด กรุณาลองใหม่ด้วยรูปที่มีใบหน้าชัดเจน",
            buttons: ["ตกลง"],
          });
          await alert.present();
          return;
        }

        // Identify face
        const identification = await this.faceDetection.identifyFace(
          detection.descriptor,
        );
        console.log(
          "[LIVE-CAMERA-TEST] Identification result:",
          identification,
        );

        await loading.dismiss();

        if (identification.identified) {
          // Match found - emit event to parent to handle
          await loading.dismiss();

          // Emit the detection result to parent component
          this.onFaceDetected.emit({
            detection: detection,
            imageDataUrl: base64Image,
          });
        } else {
          // No match - emit event to parent to handle
          await loading.dismiss();

          // Emit no match event
          this.onMatchError.emit("ไม่พบพนักงานในระบบ");
        }
      } catch (error) {
        console.error("[LIVE-CAMERA-TEST] Error:", error);
        await loading.dismiss();

        const alert = await this.alertCtrl.create({
          header: "เกิดข้อผิดพลาด",
          message: "ไม่สามารถประมวลผลภาพได้: " + error,
          buttons: ["ตกลง"],
        });
        await alert.present();
      }
    };

    input.click();
  }

  /**
   * แปลงไฟล์เป็น Base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  ngOnDestroy() {
    this.clearNoFaceTimeout();
    this.stopCamera();
  }
}
