import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";
import {
  StorageService,
  UserProfile,
  AttendanceRecord,
} from "../../services/storage.service";
import { AlertController, ToastController } from "@ionic/angular";
import { SyncSchedulerService } from "../../services/sync-scheduler.service";

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.page.html",
  styleUrls: ["./admin-dashboard.page.scss"],
})
export class AdminDashboardPage implements OnInit {
  sessionTimeRemaining: number = 30;
  totalEmployees: number = 0;
  todayAttendance: number = 0;
  totalRecords: number = 0;
  lastSyncTime: string = "";
  isSyncing: boolean = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private storage: StorageService,
    private alertController: AlertController,
    private toastController: ToastController,
    private syncScheduler: SyncSchedulerService
  ) {}

  async ngOnInit() {
    await this.checkAuthentication();
    await this.loadStats();
    await this.updateSessionTime();
    this.updateSyncStatus();

    // Update session time every minute
    setInterval(async () => {
      await this.updateSessionTime();
    }, 60000);

    // Update sync status every 10 seconds
    setInterval(() => {
      this.updateSyncStatus();
    }, 10000);
  }

  async checkAuthentication() {
    const isAuth = await this.authService.isAuthenticated();
    if (!isAuth) {
      this.router.navigate(["/scan"]);
    }
  }

  async updateSessionTime() {
    this.sessionTimeRemaining =
      await this.authService.getSessionTimeRemaining();

    // If session expired, logout silently without popup
    if (this.sessionTimeRemaining === 0) {
      await this.authService.logout();
      this.router.navigate(["/scan"]);
    }
  }

  async loadStats() {
    // Get total employees (all users from user_profiles)
    const employees: UserProfile[] = await this.storage.getAllUsers();
    this.totalEmployees = employees.length;

    // Get today's attendance
    const todayRecords: AttendanceRecord[] =
      await this.storage.getTodayAttendance();
    this.todayAttendance = todayRecords.filter(
      (r) => r.type === "check-in"
    ).length;

    // Get total records
    const allRecords: AttendanceRecord[] =
      await this.storage.getAttendanceRecords();
    this.totalRecords = allRecords.length;
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  goToSettings() {
    this.router.navigate(["/admin-settings"]);
  }

  updateSyncStatus() {
    this.lastSyncTime = this.syncScheduler.getFormattedLastSyncTime();
    this.isSyncing = this.syncScheduler.getIsSyncing();
  }

  async manualSync() {
    const result = await this.syncScheduler.manualSync();

    const toast = await this.toastController.create({
      message: result.message,
      duration: 2000,
      position: "top",
      color: result.success ? "success" : "warning",
    });
    await toast.present();

    if (result.success) {
      await this.loadStats(); // Reload stats after sync
      this.updateSyncStatus();
    }
  }

  async logout() {
    const alert = await this.alertController.create({
      header: "ออกจากโหมด Admin",
      message: "คุณต้องการออกจากโหมดผู้ดูแลระบบหรือไม่?",
      buttons: [
        {
          text: "ยกเลิก",
          role: "cancel",
        },
        {
          text: "ออก",
          handler: async () => {
            await this.authService.logout();
            this.router.navigate(["/scan"]);
          },
        },
      ],
    });

    await alert.present();
  }
}
