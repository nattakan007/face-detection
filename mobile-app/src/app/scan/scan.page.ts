import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FaceDetectionService } from "../services/face-detection.service";
import { StorageService, AttendanceRecord } from "../services/storage.service";
import { SettingsService } from "../services/settings.service";
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
export class ScanPage implements OnInit {
  userProfile: any = null;
  lastAttendance: any = null;
  isScanning = false;
  previewImage: string | null = null;

  constructor(
    private router: Router,
    private faceDetection: FaceDetectionService,
    private storage: StorageService,
    private settingsService: SettingsService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private popoverCtrl: PopoverController
  ) {}

  async ngOnInit() {
    await this.faceDetection.loadModels();
    this.userProfile = await this.storage.getUserProfile();
    this.lastAttendance = await this.getLastAttendance();
    // Load schedule settings
    await this.settingsService.getSettings();
  }

  async getLastAttendance() {
    const todayRecords = await this.storage.getTodayAttendance();
    return todayRecords.length > 0 ? todayRecords[0] : null;
  }

  async startScan() {
    if (this.isScanning) return;

    this.isScanning = true;
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
      this.previewImage = imageDataUrl;

      loading.message = "กำลังตรวจจับใบหน้า...";

      // Detect face
      const detection = await this.faceDetection.detectFace(imageDataUrl);

      if (!detection.detected) {
        throw new Error(detection.error || "ไม่พบใบหน้าในภาพ กรุณาลองใหม่");
      }

      // Show warning if low confidence
      if (detection.warning) {
        const alert = await this.alertCtrl.create({
          header: "คำเตือน",
          message: detection.warning,
          buttons: [
            {
              text: "ยกเลิก",
              role: "cancel",
            },
            {
              text: "ดำเนินการต่อ",
              handler: async () => {
                await this.processAttendance(detection, imageDataUrl, loading);
              },
            },
          ],
        });
        await alert.present();
        return;
      }

      await this.processAttendance(detection, imageDataUrl, loading);
    } catch (error: any) {
      const alert = await this.alertCtrl.create({
        header: "เกิดข้อผิดพลาด",
        message: error.message || "ไม่สามารถสแกนใบหน้าได้ กรุณาลองใหม่",
        buttons: ["ตกลง"],
      });
      await alert.present();
    } finally {
      this.isScanning = false;
      this.previewImage = null;
      await loading.dismiss();
    }
  }

  getNextAction(): string {
    if (!this.lastAttendance) return "เช็คชื่อเข้างาน";
    return this.lastAttendance.type === "check-in"
      ? "เช็คชื่อออกงาน"
      : "เช็คชื่อเข้างาน";
  }

  async processAttendance(detection: any, imageDataUrl: string, loading: any) {
    try {
      // Identify face from local storage
      const identification = await this.faceDetection.identifyFace(
        detection.descriptor
      );

      if (!identification.identified) {
        const alert = await this.alertCtrl.create({
          header: "ไม่สามารถระบุตัวตนได้",
          message: identification.message || "ไม่พบข้อมูลใบหน้าในระบบ",
          buttons: ["ตกลง"],
        });
        await alert.present();
        return;
      }

      // Determine check-in or check-out
      const now = new Date();
      const type =
        this.lastAttendance?.type === "check-in" ? "check-out" : "check-in";

      // Check for duplicate attendance within 5 minutes
      const isDuplicate = await this.checkDuplicateAttendance(
        identification.employeeId || "",
        type
      );

      if (isDuplicate) {
        const alert = await this.alertCtrl.create({
          header: "ข้อมูลซ้ำซ้อน",
          message: `คุณได้${
            type === "check-in" ? "เช็คชื่อเข้างาน" : "เช็คชื่อออกงาน"
          }ไปแล้วเมื่อไม่นานนี้ กรุณารออย่างน้อย 5 นาทีก่อนเช็คชื่อซ้ำ`,
          buttons: ["ตกลง"],
        });
        await alert.present();
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

      // Show success message with confidence
      const message =
        type === "check-in"
          ? `เช็คชื่อเข้างานสำเร็จ! (${Math.round(
              detection.confidence * 100
            )}% confidence)`
          : `เช็คชื่อออกงานสำเร็จ! (${Math.round(
              detection.confidence * 100
            )}% confidence)`;

      const toast = await this.toastCtrl.create({
        message,
        color: "success",
        duration: 3000,
      });
      await toast.present();

      // Update last attendance
      this.lastAttendance = record;

      // Reset preview image
      this.previewImage = null;
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * Check if employee has duplicate attendance within 5 minutes
   */
  private async checkDuplicateAttendance(
    employeeId: string,
    type: "check-in" | "check-out"
  ): Promise<boolean> {
    const records = await this.storage.getAttendanceRecords();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000; // 5 minutes in milliseconds

    const recentDuplicate = records.find(
      (record: AttendanceRecord) =>
        record.employeeId === employeeId &&
        record.type === type &&
        record.timestamp > fiveMinutesAgo
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
        "success"
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
        "employeeList"
      ) as HTMLElement;
      if (employeeListEl) {
        this.renderEmployeeList(employees, employeeListEl);

        // Add search functionality
        const searchInput = document.getElementById(
          "employeeSearch"
        ) as HTMLIonInputElement;
        if (searchInput) {
          await searchInput.componentOnReady();
          searchInput.addEventListener("ionInput", (e: any) => {
            const searchTerm = e.target.value?.toLowerCase() || "";
            const filtered = employees.filter(
              (emp) =>
                emp.name.toLowerCase().includes(searchTerm) ||
                emp.employeeId.toLowerCase().includes(searchTerm)
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
          (i: any) => ((i as HTMLElement).style.border = "1px solid #e0e0e0")
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
      '.employee-item[data-selected="true"]'
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
            detection.confidence * 100
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
    imageDataUrl: string
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
              detection.confidence * 100
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

  // Live Camera Event Handlers
  async onPhotoCaptured(imageDataUrl: any) {
    console.log("Photo captured:", imageDataUrl);
    // Handle photo capture if needed
  }

  async onFaceDetected(event: any) {
    if (!event.detected) return;

    const loading = await this.loadingCtrl.create({
      message: "กำลังบันทึกข้อมูลการเข้างาน...",
    });
    await loading.present();

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

      // Save attendance record with face identification info
      const record = await this.storage.saveAttendance({
        type,
        timestamp: now.getTime(),
        date: now.toLocaleDateString("th-TH"),
        time: now.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        location: location,
        faceDescriptor: event.user.faceDescriptor || event.user.descriptor,
        confidence: event.confidence,
        employeeId: event.user.employeeId || event.user.id,
        employeeName: event.user.name,
        employeeDepartment: event.user.department,
      });

      // Update last attendance
      this.lastAttendance = record;

      // Show success message
      const toast = await this.toastCtrl.create({
        message: `${
          type === "check-in" ? "เช็คชื่อเข้างาน" : "เช็คชื่อออกงาน"
        }สำเร็จ! คุณ${event.user.name}`,
        color: "success",
        duration: 3000,
      });
      await toast.present();
    } catch (error) {
      console.error("Error saving attendance:", error);
      const toast = await this.toastCtrl.create({
        message: "เกิดข้อผิดพลาดในการบันทึกข้อมูล",
        color: "danger",
        duration: 3000,
      });
      await toast.present();
    } finally {
      await loading.dismiss();
    }
  }
}
