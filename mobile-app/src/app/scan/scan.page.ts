import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router } from "@angular/router";
import { Platform } from "@ionic/angular";
import { FaceDetectionService } from "../services/face-detection.service";
import { StorageService, AttendanceRecord } from "../services/storage.service";
import { SettingsService } from "../services/settings.service";
import { AuthService } from "../services/auth.service";
import { Geolocation, Position } from "@capacitor/geolocation";
import {
  LoadingController,
  ToastController,
  AlertController,
  PopoverController,
} from "@ionic/angular";
import { SettingsMenuPopover } from "./settings-menu.popover";

@Component({
  selector: "app-scan",
  templateUrl: "scan.page.html",
  styleUrls: ["scan.page.scss"],
})
export class ScanPage implements OnInit, OnDestroy {
  userProfile: any = null;
  lastAttendance: any = null;
  isScanning = false;
  scanMode: "check-in" | "check-out" = "check-in";
  previewImage: string | null = null;
  showTestButton = false;

  // New UI properties
  currentTime: string = "";
  currentDate: string = "";
  todayCheckIn: string | null = null;
  todayCheckOut: string | null = null;
  employeeCount: number = 0;
  isOnline: boolean = true;
  private timeInterval: any;

  constructor(
    private router: Router,
    private platform: Platform,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private settingsService: SettingsService,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController,
  ) {}

  async ngOnInit() {
    // Show test button only on browser
    this.showTestButton = !this.platform.is("capacitor");

    await this.faceDetection.loadModels();
    this.userProfile = await this.storage.getUserProfile();
    this.lastAttendance = await this.getLastAttendance();
    // Load schedule settings
    await this.settingsService.getSettings();

    // Initialize new UI
    this.updateDateTime();
    this.timeInterval = setInterval(() => this.updateDateTime(), 1000);
    await this.loadTodayStatus();
    await this.loadEmployeeCount();
    this.isOnline = navigator.onLine;
    window.addEventListener("online", () => (this.isOnline = true));
    window.addEventListener("offline", () => (this.isOnline = false));
  }

  ionViewWillEnter() {
    // Reset scanning state when entering this page
    this.isScanning = false;
    this.loadTodayStatus();
    this.loadEmployeeCount();
  }

  ionViewWillLeave() {
    // Keep timer running - only clear on destroy
  }

  ngOnDestroy() {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
  }

  updateDateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString("th-TH", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    this.currentDate = now.toLocaleDateString("th-TH", options);
  }

  async loadTodayStatus() {
    const todayRecords = await this.storage.getTodayAttendance();
    const checkInRecord = todayRecords.find(
      (r: AttendanceRecord) => r.type === "check-in",
    );
    const checkOutRecord = todayRecords.find(
      (r: AttendanceRecord) => r.type === "check-out",
    );
    this.todayCheckIn = checkInRecord?.time || null;
    this.todayCheckOut = checkOutRecord?.time || null;
  }

  async loadEmployeeCount() {
    const users = await this.storage.getAllUsers();
    this.employeeCount = users.length;
  }

  async goToAdmin() {
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      this.router.navigate(["/admin-login"]);
    } else {
      this.router.navigate(["/admin-login"]);
    }
  }

  async getLastAttendance() {
    const todayRecords = await this.storage.getTodayAttendance();
    return todayRecords.length > 0 ? todayRecords[0] : null;
  }

  // Start scanning with specified mode (check-in or check-out)
  startScan(mode: "check-in" | "check-out") {
    this.scanMode = mode;
    this.isScanning = true;
  }

  // Cancel scanning and reset to button selection
  cancelScan() {
    this.isScanning = false;
  }

  // Handle face detected from live camera with auto-scan
  async onFaceDetected(event: any) {
    console.log("[SCAN-PAGE] onFaceDetected() called");
    console.log("[SCAN-PAGE] Event data:", {
      hasImageData: !!event?.imageDataUrl,
      hasDetection: !!event?.detection,
      detectionDetected: event?.detection?.detected,
      detectionConfidence: event?.detection?.confidence,
      detectionMatched: event?.detection?.matched,
      detectionNoMatch: event?.detection?.noMatch,
      isScanning: this.isScanning,
      scanMode: this.scanMode,
    });

    if (!this.isScanning) {
      console.log("[SCAN-PAGE] Not scanning, ignoring event");
      return;
    }

    const { imageDataUrl, detection } = event;

    console.log("[SCAN-PAGE] Processing face detection...");
    // Process attendance based on scan mode
    await this.processFaceDetection(detection, imageDataUrl);
    console.log("[SCAN-PAGE] Face detection processing completed");
  }

  async onPhotoCaptured(imageDataUrl: string) {
    // Legacy handler - not used in auto-scan mode
  }

  async onMatchError(error: string) {
    this.isScanning = false;
    // Navigate ไปหน้าแจ้งเตือน
    this.router.navigate(["/notification"], {
      state: {
        type: "error",
        title: "เกิดข้อผิดพลาด",
        message: error,
      },
    });
  }

  async onNoFace() {
    this.isScanning = false;
    // Navigate ไปหน้าแจ้งเตือน
    this.router.navigate(["/notification"], {
      state: {
        type: "warning",
        title: "ไม่พบใบหน้า",
        message: "กรุณาลองใหม่อีกครั้ง",
      },
    });
  }

  /**
   * เมื่อไม่พบใบหน้าเป็นเวลา 3 วินาที - กลับหน้าแรก
   */
  async onNoFaceTimeout() {
    this.isScanning = false;
    this.router.navigate(["/scan"]);
  }

  async processFaceDetection(detection: any, imageDataUrl: string) {
    const loading = await this.loadingCtrl.create({
      message: "กำลังตรวจสอบใบหน้า...",
    });
    await loading.present();

    try {
      console.log("=== Starting face detection process ===");
      if (!detection.detected) {
        throw new Error(detection.error || "ไม่พบใบหน้าในภาพ กรุณาลองใหม่");
      }

      // Verify face descriptor exists
      if (!detection.descriptor) {
        throw new Error("ไม่สามารถดึงข้อมูลใบหน้าได้");
      }

      // Show warning if low confidence
      if (detection.warning) {
        await loading.dismiss();
        const alert = await this.alertCtrl.create({
          header: "คำเตือน",
          message: detection.warning,
          buttons: [
            {
              text: "ยกเลิก",
              role: "cancel",
              handler: () => {
                this.isScanning = false;
              },
            },
            {
              text: "ดำเนินการต่อ",
              handler: async () => {
                await this.processAttendance(detection, imageDataUrl);
              },
            },
          ],
        });
        await alert.present();
        return;
      }

      await this.processAttendance(detection, imageDataUrl);
      console.log("=== Dismissing loading ===");
      await loading.dismiss();
    } catch (error: any) {
      console.error("=== Error in face detection ===", error);
      await loading.dismiss();
      this.isScanning = false;
      // Navigate ไปหน้าแจ้งเตือนข้อผิดพลาด
      this.router.navigate(["/notification"], {
        state: {
          type: "error",
          title: "เกิดข้อผิดพลาด",
          message: error.message || "ไม่สามารถสแกนใบหน้าได้ กรุณาลองใหม่",
        },
      });
    }
  }

  getNextAction(): string {
    if (!this.lastAttendance) return "เช็คชื่อเข้างาน";
    return this.lastAttendance.type === "check-in"
      ? "เช็คชื่อออกงาน"
      : "เช็คชื่อเข้างาน";
  }

  async processAttendance(detection: any, imageDataUrl: string) {
    try {
      // Identify face from local storage
      const identification = await this.faceDetection.identifyFace(
        detection.descriptor,
      );

      if (!identification.identified) {
        this.isScanning = false;
        // Navigate ไปหน้าแจ้งเตือน
        this.router.navigate(["/notification"], {
          state: {
            type: "error",
            title: "ไม่สามารถระบุตัวตนได้",
            message: identification.message || "ไม่พบข้อมูลใบหน้าในระบบ",
          },
        });
        return;
      }

      // Use the scan mode instead of determining from last attendance
      const type = this.scanMode;
      const now = new Date();

      // Check for duplicate attendance within 5 minutes
      const isDuplicate = await this.checkDuplicateAttendance(
        identification.employeeId || "",
        type,
      );

      if (isDuplicate) {
        this.isScanning = false;
        // Navigate ไปหน้าแจ้งเตือน
        this.router.navigate(["/notification"], {
          state: {
            type: "warning",
            title: "ข้อมูลซ้ำซ้อน",
            message: `คุณได้${
              type === "check-in" ? "เช็คชื่อเข้างาน" : "เช็คชื่อออกงาน"
            }ไปแล้วเมื่อไม่นานนี้ กรุณารออย่างน้อย 5 นาทีก่อนเช็คชื่อซ้ำ`,
          },
        });
        return;
      }

      // Get current location (optional for offline mode)
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

      // Save attendance record with face identification info
      console.log("=== Saving attendance record ===");
      const record = await this.storage.saveAttendance({
        type,
        timestamp: now.getTime(),
        date: now.toLocaleDateString("th-TH"),
        time: now.toLocaleTimeString("th-TH"),
        location,
        faceDescriptor: detection.descriptor as number[] | undefined,
        photoDataUrl: imageDataUrl,
        confidence: detection.confidence,
        employeeId: identification.employeeId || "",
        employeeName: identification.userName || "",
      });
      console.log("=== Attendance saved successfully ===", record);

      // Stop scanning
      this.isScanning = false;
      console.log("=== Stopped scanning, navigating... ===");

      // Navigate ไปหน้าแจ้งเตือนสำเร็จทันที
      this.router.navigate(["/notification"], {
        state: {
          type: "success",
          title: type === "check-in" ? "เข้างานสำเร็จ!" : "ออกงานสำเร็จ!",
          message: `บันทึกข้อมูล${
            type === "check-in" ? "เข้างาน" : "ออกงาน"
          }เรียบร้อยแล้ว`,
          details: {
            employeeName: identification.userName,
            confidence: Math.round(detection.confidence * 100),
            time: now.toLocaleTimeString("th-TH"),
          },
        },
      });

      // Sync จะทำงานตามรอบเวลาผ่าน SyncSchedulerService (ทุก 5 นาที)

      // Update last attendance
      this.lastAttendance = record;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Check if employee has duplicate attendance within configured time window
   */
  private async checkDuplicateAttendance(
    employeeId: string,
    type: "check-in" | "check-out",
  ): Promise<boolean> {
    const records = await this.storage.getAttendanceRecords();

    // Load duplicate prevention window from settings
    const attendanceSettings =
      await this.settingsService.getAttendanceSettings();
    const preventionWindow = attendanceSettings.duplicatePreventionWindow; // milliseconds

    const cutoffTime = Date.now() - preventionWindow;

    const recentDuplicate = records.find(
      (record: AttendanceRecord) =>
        record.employeeId === employeeId &&
        record.type === type &&
        record.timestamp > cutoffTime,
    );

    return !!recentDuplicate;
  }

  getTodayStatus(): string {
    if (!this.lastAttendance) return "ยังไม่ได้เช็คชื่อ";

    if (this.lastAttendance.type === "check-in") {
      return `เช็คชื่อเข้าแล้วเวลา ${this.lastAttendance.time}`;
    } else {
      return "เช็คชื่อเข้า-ออกครบแล้ว";
    }
  }

  getCurrentDate(): string {
    const today = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    };
    return today.toLocaleDateString("th-TH", options);
  }

  getWorkDuration(): string | null {
    if (!this.lastAttendance?.checkIn || !this.lastAttendance?.checkOut) {
      return null;
    }

    const checkInTime = new Date(`2000-01-01 ${this.lastAttendance.checkIn}`);
    const checkOutTime = new Date(`2000-01-01 ${this.lastAttendance.checkOut}`);
    const diff = checkOutTime.getTime() - checkInTime.getTime();

    const hours = Math.floor(diff / 1000 / 60 / 60);
    const minutes = Math.floor((diff / 1000 / 60) % 60);

    return `${hours} ชั่วโมง ${minutes} นาที`;
  }

  async isLate(): Promise<boolean> {
    if (!this.lastAttendance?.checkIn) return false;

    const settings = await this.settingsService.getSettings();
    const checkInTime = new Date(`2000-01-01 ${this.lastAttendance.checkIn}`);
    const lateTime = new Date(`2000-01-01 ${settings.lateTime}`);

    return checkInTime > lateTime;
  }

  async getStatusMessage(): Promise<string> {
    if (!this.lastAttendance?.checkIn) return "";

    if (await this.isLate()) {
      return "มาสาย";
    }

    return "มาตรงเวลา";
  }

  hasCheckedIn(): boolean {
    return (
      this.lastAttendance?.type === "check-in" ||
      this.lastAttendance?.type === "check-out"
    );
  }

  getCheckInTime(): string {
    if (!this.lastAttendance?.checkIn) return "";
    return this.lastAttendance.checkIn;
  }

  getProfileStatus(): string {
    if (!this.lastAttendance) return "ยังไม่ได้เช็คชื่อ";
    if (this.lastAttendance.type === "check-out") return "เลิกงานแล้ว";
    return "เข้างานแล้ว";
  }

  async presentMenu(ev: any) {
    const isOfflineMode = await this.settingsService.isOfflineMode();

    const popover = await this.popoverCtrl.create({
      component: SettingsMenuPopover,
      componentProps: {
        isOfflineMode: isOfflineMode,
        isLoading: false,
        refreshFromApi: async () => {
          const loading = await this.loadingCtrl.create({
            message: "กำลังอัปเดตข้อมูลจากเซิร์ฟเวอร์...",
          });
          await loading.present();

          try {
            await this.settingsService.refreshFromApi();
            const toast = await this.toastCtrl.create({
              message: "อัปเดตข้อมูลเรียบร้อย",
              color: "success",
              duration: 2000,
            });
            await toast.present();
          } catch (error) {
            const toast = await this.toastCtrl.create({
              message: "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้",
              color: "danger",
              duration: 2000,
            });
            await toast.present();
          } finally {
            await loading.dismiss();
          }
        },
      },
      event: ev,
      translucent: true,
    });
    await popover.present();
  }

  goToRegister() {
    this.router.navigate(["/register"]);
  }

  /**
   * Manual check-in: Navigate to dedicated page
   */
  async startManualCheckIn() {
    this.router.navigate(["/manual-checkin"]);
  }

  /**
   * Capture photo and save manual attendance
   */
  private async capturePhotoForManualCheckin(employeeInfo: {
    name: string;
    department: string;
    employeeId: string;
  }) {
    const loading = await this.loadingCtrl.create({
      message: "กำลังเปิดกล้อง...",
    });
    await loading.present();

    try {
      // Take photo
      const imageDataUrl = await this.faceDetection.takePhoto();
      if (!imageDataUrl) {
        throw new Error("ไม่สามารถถ่ายภาพได้");
      }

      loading.message = "กำลังตรวจจับใบหน้า...";

      // Detect face (optional - just for photo quality check)
      const detection = await this.faceDetection.detectFace(imageDataUrl);

      // Even if face not detected clearly, allow manual check-in
      const confidence = detection.detected ? detection.confidence : 0;

      // Get current location
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

      // Save attendance record
      const record = await this.storage.saveAttendance({
        type,
        timestamp: now.getTime(),
        date: now.toLocaleDateString("th-TH"),
        time: now.toLocaleTimeString("th-TH"),
        location,
        employeeId: employeeInfo.employeeId,
        employeeName: employeeInfo.name,
        employeeDepartment: employeeInfo.department,
        faceDescriptor: detection.descriptor as number[] | undefined,
        photoDataUrl: imageDataUrl,
        confidence: confidence,
      });

      await loading.dismiss();

      // Show success
      const successAlert = await this.alertCtrl.create({
        header: type === "check-in" ? "✅ เข้างานสำเร็จ" : "✅ ออกงานสำเร็จ",
        message: `
          <div style="text-align: center;">
            <img src="${imageDataUrl}" style="width: 120px; height: 120px; border-radius: 60px; object-fit: cover; margin-bottom: 12px; border: 3px solid #10b981;" />
            <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${employeeInfo.name}</div>
            <div style="color: #666; margin-bottom: 4px;">${employeeInfo.department}</div>
            <div style="color: #888; font-size: 14px;">${record.time}</div>
          </div>
        `,
        buttons: ["ตกลง"],
      });
      await successAlert.present();

      // Update last attendance
      this.lastAttendance = record;

      this.showToast(
        `${type === "check-in" ? "เข้างาน" : "ออกงาน"}สำเร็จแล้ว`,
        "success",
      );
    } catch (error: any) {
      await loading.dismiss();
      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: error.message || "ไม่สามารถบันทึกได้ กรุณาลองใหม่",
        buttons: ["ตกลง"],
      });
      await alert.present();
    }
  }

  private async showToast(message: string, color: string) {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 2000,
    });
    await toast.present();
  }

  /**
   * Show employee selection modal (alternative to manual entry)
   */
  async showEmployeeSelection() {
    // Load all employees
    const employees = await this.storage.getAllUsers();

    if (employees.length === 0) {
      const alert = await this.alertCtrl.create({
        header: "ไม่พบรายชื่อในระบบ",
        message: "กรุณาลงทะเบียนก่อนใช้งาน หรือ ติดต่อฝ่ายบุคคล",
        buttons: [
          {
            text: "ลงทะเบียนพนักงาน",
            handler: () => {
              this.router.navigate(["/register"]);
            },
          },
          {
            text: "ติดต่อฝ่ายบุคคล",
            handler: () => {
              // Open phone dialer or show contact info
              window.open("tel:0800000000");
            },
          },
          {
            text: "ปิด",
            role: "cancel",
          },
        ],
      });
      await alert.present();
      return;
    }

    // Create modal for employee selection
    const modal = await this.alertCtrl.create({
      header: "เลือกพนักงาน",
      message: `
        <div class="employee-selection-wrapper">
          <ion-item style="--background: none; --border-width: 0;">
            <ion-input
              id="employeeSearch"
              placeholder="ค้นหาชื่อพนักงาน..."
              clear-input="true">
            </ion-input>
          </ion-item>
          <div id="employeeList" class="employee-list"></div>
        </div>
      `,
      inputs: [],
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ตกลง",
          handler: () => {
            const selectedEmployee = this.getSelectedEmployee();
            if (!selectedEmployee) {
              this.alertCtrl
                .create({
                  header: "กรุณาเลือกพนักงาน",
                  message: "คลิกที่ชื่อพนักงานที่ต้องการเพื่อดำเนินการต่อ",
                  buttons: ["ตกลง"],
                })
                .then((alert) => alert.present());
              return false; // Prevent modal from closing
            }
            // Proceed with face verification
            this.showFaceVerification(selectedEmployee);
            return true;
          },
        },
      ],
      cssClass: "employee-selection-modal",
    });

    // Wait for modal to be presented
    await modal.present();

    // Add employee list to modal
    setTimeout(async () => {
      const employeeListEl = document.getElementById(
        "employeeList",
      ) as HTMLElement;
      if (employeeListEl) {
        this.renderEmployeeList(employees, employeeListEl);

        // Add search functionality
        const searchInput = document.getElementById("employeeSearch") as any;
        if (searchInput) {
          await searchInput.componentOnReady?.();
          searchInput.addEventListener("ionInput", (e: any) => {
            const searchTerm = e.target.value?.toLowerCase() || "";
            const filtered = employees.filter(
              (emp) =>
                emp.name.toLowerCase().includes(searchTerm) ||
                emp.employeeId.toLowerCase().includes(searchTerm),
            );
            this.renderEmployeeList(filtered, employeeListEl);
          });
        }
      }
    }, 300);
  }

  private renderEmployeeList(employees: any[], container: HTMLElement) {
    container.innerHTML = "";

    employees.forEach((employee) => {
      const item = document.createElement("div");
      item.className = "employee-item";
      item.style.cssText = `
        padding: 15px;
        margin: 10px 0;
        border: 1px solid #e0e0e0;
        border-radius: 10px;
        background: white;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 15px;">
          <div style="flex-shrink: 0;">
            <img src="${
              employee.photoPath || "assets/images/default-avatar.svg"
            }"
                 style="width: 60px; height: 60px; border-radius: 50%; object-fit: cover; border: 2px solid #f0f0f0;" />
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #333; font-size: 16px;">${
              employee.name
            }</div>
            <div style="color: #666; font-size: 14px; margin-top: 4px;">${
              employee.employeeId
            }</div>
            <div style="color: #888; font-size: 12px; margin-top: 4px;">${
              employee.department || "-"
            }</div>
          </div>
          <div style="color: #4CAF50; font-weight: bold;">
            ✓
          </div>
        </div>
      `;

      item.addEventListener("click", () => {
        // Remove previous selections
        const items = container.querySelectorAll(".employee-item");
        items.forEach(
          (i: any) => ((i as HTMLElement).style.border = "1px solid #e0e0e0"),
        );

        // Mark as selected
        item.style.border = "2px solid #4CAF50";

        // Store selected employee
        item.setAttribute("data-selected", "true");
        item.setAttribute("data-employee", JSON.stringify(employee));
      });

      item.addEventListener("mouseenter", () => {
        if (!item.getAttribute("data-selected")) {
          item.style.background = "#f9f9f9";
          item.style.transform = "translateY(-2px)";
        }
      });

      item.addEventListener("mouseleave", () => {
        if (!item.getAttribute("data-selected")) {
          item.style.background = "white";
          item.style.transform = "translateY(0)";
        }
      });

      container.appendChild(item);
    });
  }

  private getSelectedEmployee(): any {
    const selectedItem = document.querySelector(
      '.employee-item[data-selected="true"]',
    );
    if (selectedItem) {
      return JSON.parse(selectedItem.getAttribute("data-employee") || "{}");
    }
    return null;
  }

  private async showFaceVerification(employee: any) {
    const loading = await this.loadingCtrl.create({
      message: "กำลังเปิดกล้อง...",
      duration: 0, // Don't auto-dismiss
    });
    await loading.present();

    try {
      // Show camera preview initially
      loading.message = "กรุณาถ่ายรูปใบหน้า";

      // Take photo for face verification
      const imageDataUrl = await this.faceDetection.takePhoto();
      if (!imageDataUrl) {
        throw new Error("ไม่สามารถถ่ายภาพได้");
      }

      loading.message = "กำลังตรวจสอบใบหน้า...";

      // Detect face
      const detection = await this.faceDetection.detectFace(imageDataUrl);

      if (!detection.detected) {
        const alert = await this.alertCtrl.create({
          header: "ไม่พบใบหน้า",
          message: detection.error || "ไม่พบใบหน้าในภาพ กรุณาถ่ายรูปใหม่",
          buttons: [
            {
              text: "ลองใหม่",
              handler: () => {
                this.showFaceVerification(employee);
              },
            },
            {
              text: "ยกเลิก",
              role: "cancel",
            },
          ],
        });
        await alert.present();
        return;
      }

      // Show warning if low confidence
      if (detection.confidence < 0.7) {
        const alert = await this.alertCtrl.create({
          header: "ความแม่นยำต่ำ",
          message: `ตรวจพบใบหน้า ${Math.round(
            detection.confidence * 100,
          )}% เท่านั้น\nต้องการความมั่นอย่างน้อย 70% จึงจะดำเนินการต่อ`,
          buttons: [
            {
              text: "ลองใหม่",
              handler: () => {
                this.showFaceVerification(employee);
              },
            },
            {
              text: "ดำเนินการต่อ",
              handler: () => {
                this.processManualAttendance(employee, detection, imageDataUrl);
              },
            },
            {
              text: "ยกเลิก",
              role: "cancel",
            },
          ],
        });
        await alert.present();
        return;
      }

      // Process attendance if confidence is good
      await this.processManualAttendance(employee, detection, imageDataUrl);
    } catch (error: any) {
      console.error("Face verification error:", error);
      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: error.message || "ไม่สามารถตรวจสอบใบหน้าได้ กรุณาลองใหม่",
        buttons: ["ตกลง"],
      });
      await alert.present();
    } finally {
      await loading.dismiss();
    }
  }

  private async processManualAttendance(
    employee: any,
    detection: any,
    imageDataUrl: string,
  ) {
    try {
      // Get current location
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

      // Save attendance record
      const record = await this.storage.saveAttendance({
        type,
        timestamp: now.getTime(),
        date: now.toLocaleDateString("th-TH"),
        time: now.toLocaleTimeString("th-TH"),
        location,
        employeeId: employee.id,
        employeeName: employee.name,
        employeeDepartment: employee.department,
        faceDescriptor: detection.descriptor as number[] | undefined,
        photoDataUrl: imageDataUrl,
        confidence: detection.confidence,
      });

      // Show success message with details
      const alert = await this.alertCtrl.create({
        header:
          type === "check-in"
            ? "เช็คชื่อเข้างานสำเร็จ"
            : "เช็คชื่อออกงานสำเร็จ",
        message: `
          <div style="text-align: left;">
            <div style="margin-bottom: 10px;"><strong>ชื่อ:</strong> ${
              employee.name
            }</div>
            <div style="margin-bottom: 10px;"><strong>รหัสพนักงาน:</strong> ${
              employee.employeeId
            }</div>
            <div style="margin-bottom: 10px;"><strong>แผนก:</strong> ${
              employee.department || "-"
            }</div>
            <div style="margin-bottom: 10px;"><strong>เวลา:</strong> ${
              record.time
            }</div>
            <div><strong>ความมั่น:</strong> ${Math.round(
              detection.confidence * 100,
            )}%</div>
          </div>
        `,
        buttons: ["ตกลง"],
      });
      await alert.present();

      // Update last attendance
      this.lastAttendance = record;

      // Optional: Show small toast
      const toast = await this.toastCtrl.create({
        message: `${type === "check-in" ? "เข้างาน" : "ออกงาน"}สำเร็จแล้ว`,
        color: "success",
        duration: 2000,
      });
      await toast.present();
    } catch (error: any) {
      console.error("Error saving attendance:", error);
      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: "ไม่สามารถบันทึกข้อมูลการเข้างาน",
        buttons: ["ตกลง"],
      });
      await alert.present();
      throw error;
    }
  }

  /**
   * ทดสอบด้วยการอัปโหลดรูปภาพ (แสดงเฉพาะบน browser)
   */
  async testWithImageUpload() {
    // Create file input element
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      console.log("[SCAN-TEST] Image uploaded:", file.name);

      const loading = await this.loadingCtrl.create({
        message: "กำลังประมวลผลภาพ...",
      });
      await loading.present();

      try {
        // Convert to base64
        const base64Image = await this.fileToBase64(file);
        console.log(
          "[SCAN-TEST] Image converted to base64, size:",
          base64Image.length,
        );

        // Detect face
        const detection = await this.faceDetection.detectFace(base64Image);
        console.log("[SCAN-TEST] Detection result:", detection);

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
        console.log("[SCAN-TEST] Identification result:", identification);

        await loading.dismiss();

        if (identification.identified) {
          // Match found!
          const similarity = Math.round((identification.similarity || 0) * 100);
          const employee = identification.faceData;

          const alert = await this.alertCtrl.create({
            header: "✅ พบพนักงานในระบบ!",
            message: `
              <div style="text-align: left;">
                <div style="margin-bottom: 10px;"><strong>ชื่อ:</strong> ${employee.name}</div>
                <div style="margin-bottom: 10px;"><strong>รหัส:</strong> ${employee.employeeId}</div>
                <div style="margin-bottom: 10px;"><strong>ความแม่นยำ:</strong> ${similarity}%</div>
              </div>
            `,
            buttons: [
              {
                text: "ยกเลิก",
                role: "cancel",
              },
              {
                text: "บันทึกเข้างาน",
                handler: async () => {
                  this.scanMode = "check-in";
                  await this.processAttendance(detection, base64Image);
                },
              },
              {
                text: "บันทึกออกงาน",
                handler: async () => {
                  this.scanMode = "check-out";
                  await this.processAttendance(detection, base64Image);
                },
              },
            ],
          });
          await alert.present();
        } else {
          // No match
          const alert = await this.alertCtrl.create({
            header: "❌ ไม่พบพนักงานในระบบ",
            message: `
              <div style="text-align: left;">
                <div style="margin-bottom: 10px;">ตรวจพบใบหน้าในภาพ แต่ไม่ตรงกับพนักงานที่ลงทะเบียนไว้</div>
                <div><strong>ความมั่นใจ:</strong> ${Math.round(
                  detection.confidence * 100,
                )}%</div>
                ${
                  identification.debugInfo
                    ? `<div style="margin-top: 10px; font-size: 12px; color: #666;">${identification.debugInfo}</div>`
                    : ""
                }
              </div>
            `,
            buttons: ["ตกลง"],
          });
          await alert.present();
        }
      } catch (error) {
        console.error("[SCAN-TEST] Error:", error);
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

  // Live Camera Event Handlers
}
