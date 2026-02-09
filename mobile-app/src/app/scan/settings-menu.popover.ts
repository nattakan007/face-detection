import { Component } from "@angular/core";
import { PopoverController, ModalController } from "@ionic/angular";
import { Router } from "@angular/router";
import { AuthService } from "../services/auth.service";
import { PinEntryComponent } from "../components/pin-entry/pin-entry.component";

@Component({
  templateUrl: "settings-menu.popover.html",
})
export class SettingsMenuPopover {
  isOfflineMode: boolean = false;
  isLoading: boolean = false;
  isAuthenticated: boolean = false;
  refreshFromApi?: () => void;

  constructor(
    private popoverController: PopoverController,
    private router: Router,
    private authService: AuthService,
    private modalController: ModalController,
  ) {}

  async ngOnInit() {
    // Check authentication status
    this.isAuthenticated = await this.authService.isAuthenticated();
  }

  async onRefreshFromApi() {
    if (this.refreshFromApi) {
      await this.refreshFromApi();
    }
    this.closePopover();
  }

  async goToAdminSettings() {
    await this.closePopover();

    // Check if already authenticated
    const isAuth = await this.authService.isAuthenticated();

    if (!isAuth) {
      // Show PIN entry modal
      const modal = await this.modalController.create({
        component: PinEntryComponent,
        componentProps: {
          mode: "verify",
          title: "ยืนยันตัวตนเพื่อเข้าสู่ระบบ Admin",
        },
        backdropDismiss: false,
      });

      await modal.present();

      const { data, role } = await modal.onWillDismiss();

      if (role === "confirm" && data?.pin) {
        // Verify PIN
        const isValid = await this.authService.verifyPin(data.pin);

        if (isValid) {
          // Navigate to admin dashboard instead
          this.router.navigate(["/admin-dashboard"]);
        } else {
          // Show error and retry
          alert("รหัส PIN ไม่ถูกต้อง");
        }
      }
    } else {
      // Already authenticated, go to dashboard
      this.router.navigate(["/admin-dashboard"]);
    }
  }

  async closePopover() {
    await this.popoverController.dismiss();
  }

  async onLogout() {
    await this.authService.logout();
    this.isAuthenticated = false;
    await this.closePopover();

    // Show confirmation
    alert("ออกจากระบบ Admin เรียบร้อยแล้ว");
  }

  async goToHome() {
    await this.closePopover();
    // Force reload by navigating with skipLocationChange
    await this.router.navigateByUrl("/", { skipLocationChange: true });
    await this.router.navigate(["/scan"]);
  }
}
