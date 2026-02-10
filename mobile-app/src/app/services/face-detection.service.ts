import { Injectable } from "@angular/core";
import {
  Camera,
  CameraResultType,
  CameraSource,
  CameraDirection,
} from "@capacitor/camera";
import { Storage } from "@ionic/storage-angular";
import { PermissionService, PermissionResult } from "./permission.service";
import { SettingsService } from "./settings.service";
import * as faceapi from "@vladmandic/face-api";

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  descriptor: number[] | null;
  error?: string;
  warning?: string;
  landmarks?: any;
  box?: { x: number; y: number; width: number; height: number };
}

export interface FaceIdentificationResult {
  identified: boolean;
  userId?: string;
  userName?: string;
  employeeId?: string;
  similarity?: number;
  message?: string;
  error?: string;
  faceData?: any;
  debugInfo?: {
    totalUsers: number;
    bestMatch: string;
    bestMatchId: string;
    distance: string;
    threshold: string;
    similarity: string;
    minRequired: string;
    reason: string;
  };
}

@Injectable({
  providedIn: "root",
})
export class FaceDetectionService {
  private modelsLoaded = false;
  private _storage: Storage | null = null;
  private modelPath = "/assets/models/face-api";

  constructor(
    private storage: Storage,
    private permissionService: PermissionService,
    private settingsService: SettingsService,
  ) {
    this.init();
  }

  async init() {
    this._storage = await this.storage.create();
  }

  /**
   * Load face-api.js models for face detection, landmarks, and recognition
   */
  async loadModels(): Promise<boolean> {
    if (this.modelsLoaded) {
      return true;
    }

    try {
      console.log("Loading face-api.js models...");

      // Load models from assets folder
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(this.modelPath),
        faceapi.nets.tinyFaceDetector.loadFromUri(this.modelPath),
        faceapi.nets.faceLandmark68Net.loadFromUri(this.modelPath),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.modelPath),
      ]);

      console.log("Face-api.js models loaded successfully");
      this.modelsLoaded = true;
      return true;
    } catch (error) {
      console.error("Error loading face-api models:", error);
      this.modelsLoaded = false;
      return false;
    }
  }

  /**
   * Check if models are loaded and ready
   */
  isReady(): boolean {
    return this.modelsLoaded;
  }

  async takePhoto() {
    try {
      // Request camera permissions first
      const permissionResult: PermissionResult =
        await this.permissionService.requestCameraPermission();

      if (!permissionResult.granted) {
        if (permissionResult.needsSettings) {
          const error = new Error("ไม่มีสิทธิ์ในการเข้าถึงกล้อง");
          error.name = "PermissionDenied";
          throw error;
        } else {
          throw new Error(
            permissionResult.error || "ไม่สามารถขอสิทธิ์กล้องได้",
          );
        }
      }

      // Check if running on web or mobile
      const isWeb = !window.hasOwnProperty("cordova");

      // If on web, use browser camera directly
      if (isWeb) {
        // Test camera access first
        const cameraTest = await this.testCameraAccess();
        if (!cameraTest.success) {
          throw new Error(cameraTest.error || "ไม่สามารถเชื่อมต่อกับกล้องได้");
        }
        return await this.takePhotoWithBrowser();
      }

      // On native, use Capacitor Camera plugin
      // Create timeout promise to prevent hanging
      const photoPromise = Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        direction: CameraDirection.Front,
        // Additional settings to force front camera
        correctOrientation: true,
        saveToGallery: false,
      });

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Camera timeout - please try again"));
        }, 30000); // 30 seconds timeout
      });

      // Race between camera and timeout
      const image = await Promise.race([photoPromise, timeoutPromise]);
      return (image as any).dataUrl;
    } catch (error: any) {
      console.error("Error taking photo:", error);

      // Handle specific Capacitor errors
      if (error.message && error.message.includes("nativeEvent")) {
        console.error(
          "Native event error detected, switching to browser camera",
        );
        // Fallback to browser camera for native event errors
        return await this.takePhotoWithBrowser();
      }

      // For other native errors, also try fallback
      if (!error.message || !error.message.includes("Camera timeout")) {
        try {
          return await this.takePhotoWithBrowser();
        } catch (fallbackError) {
          console.error("Fallback camera also failed:", fallbackError);
          throw new Error(
            "ไม่สามารถเปิดกล้องได้ กรุณาตรวจสอบสิทธิ์การเข้าถึงกล้องและลองใหม่",
          );
        }
      }

      throw error;
    }
  }

  // Test camera accessibility
  private async testCameraAccess(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput",
      );

      if (videoDevices.length === 0) {
        return { success: false, error: "ไม่พบอุปกรณ์กล้องในระบบ" };
      }

      // Test if we can access camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });

      // Stop the test stream
      stream.getTracks().forEach((track) => track.stop());

      return { success: true };
    } catch (error: any) {
      console.error("Camera access test failed:", error);
      if (error.name === "NotAllowedError") {
        return {
          success: false,
          error: "การเข้าถึงกล้องถูกปฏิเสธ กรุณาอนุญาตสิทธิ์ใน browser",
        };
      } else if (error.name === "NotFoundError") {
        return { success: false, error: "ไม่พบอุปกรณ์กล้อง" };
      } else if (error.name === "NotReadableError") {
        return {
          success: false,
          error: "กล้องถูกใช้งานอยู่หรือมีปัญหาทางเทคนิค",
        };
      }
      return {
        success: false,
        error: "ไม่สามารถเชื่อมต่อกับกล้อง: " + error.message,
      };
    }
  }

  // Fallback camera using browser's getUserMedia API
  private async takePhotoWithBrowser(): Promise<string> {
    // First check available cameras
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(
      (device) => device.kind === "videoinput",
    );

    // Prefer front camera, but fall back to any camera if front camera not available
    let facingMode: any = "user";

    // Try to find a front camera
    const frontCamera = videoDevices.find(
      (device) =>
        device.label.toLowerCase().includes("front") ||
        device.label.toLowerCase().includes("前置") ||
        device.label.toLowerCase().includes(" selfie"),
    );

    // If no front camera found, try to use the first available camera
    if (!frontCamera && videoDevices.length > 0) {
      facingMode = { exact: "environment" }; // Try back camera if front not found
    }

    const video = document.createElement("video");
    video.autoplay = true;
    video.style.display = "none";
    video.style.position = "fixed";
    video.style.top = "-9999px";
    video.style.left = "-9999px";
    document.body.appendChild(video);

    const canvas = document.createElement("canvas");
    canvas.style.display = "none";
    canvas.style.position = "fixed";
    canvas.style.top = "-9999px";
    canvas.style.left = "-9999px";
    document.body.appendChild(canvas);

    try {
      // Get camera stream with timeout
      const stream = await this.getUserMediaWithTimeout({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      video.srcObject = stream;

      // Wait for video to start playing
      return new Promise((resolve, reject) => {
        video.onloadedmetadata = () => {
          video.play();

          // Capture image after a short delay
          setTimeout(() => {
            try {
              // Set canvas dimensions to match video
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;

              // Draw video frame to canvas
              const context = canvas.getContext("2d");
              if (!context) {
                throw new Error("Could not get canvas context");
              }

              // For front camera, flip horizontally
              context.translate(canvas.width, 0);
              context.scale(-1, 1);
              context.drawImage(video, 0, 0);

              // Get image data as data URL
              const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

              // Cleanup
              stream.getTracks().forEach((track) => track.stop());
              document.body.removeChild(video);
              document.body.removeChild(canvas);

              resolve(dataUrl);
            } catch (error) {
              // Cleanup on error
              stream.getTracks().forEach((track) => track.stop());
              document.body.removeChild(video);
              document.body.removeChild(canvas);
              reject(error);
            }
          }, 1000); // Wait 1 second for camera to initialize
        };
      });
    } catch (error) {
      // Cleanup if camera access fails
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
      throw error;
    }
  }

  // Helper method to get user media with timeout
  private getUserMediaWithTimeout(
    constraints: MediaStreamConstraints,
  ): Promise<MediaStream> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error("Camera access timeout"));
      }, 15000); // 15 seconds timeout

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then((stream) => {
          clearTimeout(timeout);
          resolve(stream);
        })
        .catch((error) => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Convert dataUrl to HTMLImageElement for TensorFlow.js
  private async dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  /**
   * Detect face and extract 128-dimensional face descriptor using face-api.js
   */
  async detectFace(imageDataUrl: string): Promise<FaceDetectionResult> {
    try {
      // Ensure models are loaded
      if (!this.modelsLoaded) {
        const loaded = await this.loadModels();
        if (!loaded) {
          return {
            detected: false,
            confidence: 0,
            descriptor: null,
            error: "ไม่สามารถโหลด AI model ได้",
          };
        }
      }

      // Convert dataUrl to image element
      const image = await this.dataUrlToImage(imageDataUrl);

      // Detect face with landmarks and descriptor using face-api.js
      // Use TinyFaceDetector for faster detection on mobile
      const detection = await faceapi
        .detectSingleFace(
          image,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.4,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return {
          detected: false,
          confidence: 0,
          descriptor: null,
          error: "ไม่พบใบหน้าในภาพ กรุณาถ่ายรูปใหม่",
        };
      }

      // Get confidence from detection score
      const confidence = detection.detection.score;

      // Get 128-dimensional face descriptor (the key improvement!)
      const descriptor = Array.from(detection.descriptor);

      // Get minimum confidence from settings
      const settings = await this.settingsService.getFaceDetectionSettings();
      const minConfidence = settings.minConfidence;

      // Check if confidence is below threshold
      if (confidence < minConfidence) {
        return {
          detected: true,
          confidence,
          descriptor,
          box: {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height,
          },
          warning: `Confidence ${Math.round(
            confidence * 100,
          )}% ต่ำกว่า ${Math.round(
            minConfidence * 100,
          )}% กรุณาถ่ายรูปใหม่เพื่อความแม่นยำ`,
        };
      }

      return {
        detected: true,
        confidence,
        descriptor,
        landmarks: detection.landmarks,
        box: {
          x: detection.detection.box.x,
          y: detection.detection.box.y,
          width: detection.detection.box.width,
          height: detection.detection.box.height,
        },
      };
    } catch (error: any) {
      console.error("Error detecting face:", error);
      return {
        detected: false,
        confidence: 0,
        descriptor: null,
        error:
          "เกิดข้อผิดพลาดในการตรวจจับใบหน้า: " +
          (error?.message || "Unknown error"),
      };
    }
  }

  /**
   * Identify face by comparing with stored user profiles
   * Uses Euclidean distance with threshold of 0.6 (recommended by face-api.js)
   */
  async identifyFace(descriptor: number[]): Promise<FaceIdentificationResult> {
    try {
      // Get all registered users with face descriptors
      const users = (await this._storage?.get("user_profiles")) || [];

      if (users.length === 0) {
        return {
          identified: false,
          message: "ไม่พบข้อมูลใบหน้าที่ลงทะเบียนไว้",
        };
      }

      // Find best match using Euclidean distance
      let bestMatch: any = null;
      let lowestDistance = Infinity;

      const inputDescriptor = new Float32Array(descriptor);

      console.log(
        "🔍 Face Identification - Total registered users:",
        users.length,
      );

      for (const user of users) {
        if (!user.faceDescriptor || user.status === "inactive") {
          console.log(`⏭️ Skip user: ${user.name} (no descriptor or inactive)`);
          continue;
        }

        const storedDescriptor = new Float32Array(user.faceDescriptor);
        const distance = faceapi.euclideanDistance(
          inputDescriptor,
          storedDescriptor,
        );

        console.log(
          `📏 Distance for ${user.name} (${
            user.employeeId
          }): ${distance.toFixed(4)}`,
        );

        if (distance < lowestDistance) {
          lowestDistance = distance;
          bestMatch = user;
        }
      }

      // Get thresholds from settings
      const settings = await this.settingsService.getFaceDetectionSettings();
      const MATCH_THRESHOLD = settings.matchDistanceThreshold;
      const MIN_SIMILARITY = settings.minSimilarityPercent;

      console.log(`⚙️ Settings - Match Threshold: ${MATCH_THRESHOLD}`);
      console.log(`⚙️ Settings - Min Similarity: ${MIN_SIMILARITY}%`);
      console.log(`🎯 Best Match: ${bestMatch?.name || "None"}`);
      console.log(`📊 Lowest Distance: ${lowestDistance.toFixed(4)}`);

      if (lowestDistance < MATCH_THRESHOLD && bestMatch) {
        // Convert distance to similarity percentage using exponential decay
        // This gives a more natural similarity curve:
        //   distance 0.0 → 100%, distance 0.3 → ~74%, distance 0.4 → ~60%, distance 0.5 → ~47%
        // The formula: similarity = exp(-3 * distance) which is smoother than linear
        const similarity = Math.exp(-3.0 * lowestDistance);
        const similarityPercent = similarity * 100;

        console.log(
          `✅ Match candidate - Similarity: ${similarityPercent.toFixed(1)}%`,
        );
        console.log(
          `📋 Required minimum: ${(MIN_SIMILARITY * 100).toFixed(1)}%`,
        );

        // ต้องมีความคล้ายกันตามที่ตั้งค่าไว้
        if (similarity >= MIN_SIMILARITY) {
          console.log(
            `✅ MATCH FOUND: ${bestMatch.name} (${similarityPercent.toFixed(
              1,
            )}%)`,
          );
          return {
            identified: true,
            userId: bestMatch.id,
            userName: bestMatch.name,
            employeeId: bestMatch.employeeId,
            similarity: similarity,
            faceData: bestMatch,
          };
        } else {
          console.log(
            `❌ SIMILARITY TOO LOW: ${similarityPercent.toFixed(1)}% < ${(
              MIN_SIMILARITY * 100
            ).toFixed(1)}%`,
          );
        }
      } else {
        console.log(
          `❌ DISTANCE TOO HIGH: ${lowestDistance.toFixed(
            4,
          )} >= ${MATCH_THRESHOLD}`,
        );
      }

      return {
        identified: false,
        message: "ไม่พบใบหน้าที่ตรงกันในระบบ",
        debugInfo: {
          totalUsers: users.length,
          bestMatch: bestMatch?.name || "ไม่มี",
          bestMatchId: bestMatch?.employeeId || "-",
          distance: lowestDistance.toFixed(4),
          threshold: MATCH_THRESHOLD.toFixed(4),
          similarity:
            lowestDistance < MATCH_THRESHOLD
              ? ((1 - lowestDistance / MATCH_THRESHOLD) * 100).toFixed(1) + "%"
              : "0.0%",
          minRequired: (MIN_SIMILARITY * 100).toFixed(1) + "%",
          reason:
            lowestDistance >= MATCH_THRESHOLD
              ? "ระยะห่างมากเกินไป"
              : "ความคล้ายต่ำเกินไป",
        },
      };
    } catch (error: any) {
      console.error("Error identifying face:", error);
      return {
        identified: false,
        error: "เกิดข้อผิดพลาดในการระบุตัวตน: " + error.message,
      };
    }
  }

  /**
   * Calculate Euclidean distance between two face descriptors
   */
  getEuclideanDistance(d1: number[], d2: number[]): number {
    const f1 = new Float32Array(d1);
    const f2 = new Float32Array(d2);
    return faceapi.euclideanDistance(f1, f2);
  }

  /**
   * Compare two face descriptors using Euclidean distance
   * Returns similarity score (0-1, higher = more similar)
   */
  async compareFaces(
    descriptor1: number[],
    descriptor2: number[],
  ): Promise<number> {
    if (
      !descriptor1 ||
      !descriptor2 ||
      descriptor1.length !== descriptor2.length
    ) {
      return 0;
    }

    const d1 = new Float32Array(descriptor1);
    const d2 = new Float32Array(descriptor2);

    const distance = faceapi.euclideanDistance(d1, d2);

    // Convert distance to similarity using exponential decay (matches identifyFace formula)
    return Math.exp(-3.0 * distance);
  }

  /**
   * Detect face directly from video element for real-time detection
   * Returns detection with bounding box for drawing overlay
   */
  async detectFaceFromVideo(videoElement: HTMLVideoElement): Promise<{
    detected: boolean;
    confidence: number;
    box?: { x: number; y: number; width: number; height: number };
    descriptor?: number[];
  }> {
    try {
      if (!this.modelsLoaded) {
        await this.loadModels();
      }

      // Use TinyFaceDetector for faster real-time performance (~100-300ms vs ~1-3s with SSD)
      const detection = await faceapi
        .detectSingleFace(
          videoElement,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 224,
            scoreThreshold: 0.4,
          }),
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        return { detected: false, confidence: 0 };
      }

      const box = detection.detection.box;

      return {
        detected: true,
        confidence: detection.detection.score,
        box: {
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
        },
        descriptor: Array.from(detection.descriptor),
      };
    } catch (error) {
      console.error("Real-time detection error:", error);
      return { detected: false, confidence: 0 };
    }
  }

  /**
   * Draw face detection overlay on canvas
   */
  async drawFaceOverlay(
    canvas: HTMLCanvasElement,
    video: HTMLVideoElement,
    detection: {
      detected: boolean;
      confidence: number;
      box?: { x: number; y: number; width: number; height: number };
    },
    isMirrored: boolean = true,
  ): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas size to video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detection.detected || !detection.box) return;

    const box = detection.box;

    // Adjust for mirrored video (front camera)
    let x = box.x;
    if (isMirrored) {
      x = canvas.width - box.x - box.width;
    }

    // Get threshold from settings for color coding
    const settings = await this.settingsService.getFaceDetectionSettings();
    const threshold = settings.minConfidence;

    // Draw bounding box
    ctx.strokeStyle = detection.confidence >= threshold ? "#00ff00" : "#ffff00";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, box.y, box.width, box.height);

    // Draw confidence label (counter-mirror so text reads correctly under CSS scaleX(-1))
    const label = `${Math.round(detection.confidence * 100)}%`;
    ctx.fillStyle = detection.confidence >= threshold ? "#00ff00" : "#ffff00";
    ctx.font = "bold 16px Arial";
    // Save, flip text horizontally at the label position so it appears normal after CSS mirror
    ctx.save();
    const labelX = x + 5;
    const labelY = box.y - 10;
    ctx.translate(labelX, labelY);
    ctx.scale(-1, 1); // counter the CSS scaleX(-1)
    ctx.fillText(label, 0, 0);
    ctx.restore();

    // Draw corner markers for better visibility
    const cornerSize = 20;
    ctx.lineWidth = 4;

    // Top-left corner
    ctx.beginPath();
    ctx.moveTo(x, box.y + cornerSize);
    ctx.lineTo(x, box.y);
    ctx.lineTo(x + cornerSize, box.y);
    ctx.stroke();

    // Top-right corner
    ctx.beginPath();
    ctx.moveTo(x + box.width - cornerSize, box.y);
    ctx.lineTo(x + box.width, box.y);
    ctx.lineTo(x + box.width, box.y + cornerSize);
    ctx.stroke();

    // Bottom-left corner
    ctx.beginPath();
    ctx.moveTo(x, box.y + box.height - cornerSize);
    ctx.lineTo(x, box.y + box.height);
    ctx.lineTo(x + cornerSize, box.y + box.height);
    ctx.stroke();

    // Bottom-right corner
    ctx.beginPath();
    ctx.moveTo(x + box.width - cornerSize, box.y + box.height);
    ctx.lineTo(x + box.width, box.y + box.height);
    ctx.lineTo(x + box.width, box.y + box.height - cornerSize);
    ctx.stroke();
  }
}
