import { Component } from "@angular/core";
import { AuthService } from "./services/auth.service";
import { AutoCheckoutService } from "./services/auto-checkout.service";
import { SyncSchedulerService } from "./services/sync-scheduler.service";
import { Network } from "@capacitor/network";

@Component({
  selector: "app-root",
  templateUrl: "app.component.html",
  styleUrls: ["app.component.scss"],
})
export class AppComponent {
  constructor(
    private authService: AuthService,
    private autoCheckoutService: AutoCheckoutService,
    private syncScheduler: SyncSchedulerService
  ) {
    this.initializeApp();
  }

  async initializeApp() {
    // Check if PIN is set up, if not set default PIN
    const hasPinSetup = await this.authService.hasPinSetup();
    if (!hasPinSetup) {
      // Set default PIN on first launch
      await this.authService.setupPin("000000");
      console.log("Default PIN (000000) has been set");
    }

    // Start auto checkout monitoring
    await this.autoCheckoutService.startMonitoring();

    // Start auto sync scheduler (every 5 minutes)
    this.syncScheduler.startAutoSync(5);

    // Listen for network status changes
    Network.addListener("networkStatusChange", (status) => {
      if (status.connected) {
        console.log("Network connected, triggering sync");
        // Trigger sync when network becomes available
        setTimeout(() => {
          this.syncScheduler.manualSync();
        }, 2000);
      }
    });
  }
}
