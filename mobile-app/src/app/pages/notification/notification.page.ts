import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-notification",
  templateUrl: "./notification.page.html",
  styleUrls: ["./notification.page.scss"],
})
export class NotificationPage implements OnInit {
  type: "success" | "error" | "warning" = "success";
  title: string = "";
  message: string = "";
  details: any = null;
  iconName: string = "checkmark-circle";
  countdown: number = 5;
  private countdownInterval: any;

  constructor(private router: Router) {
    // Get navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      this.type = state["type"] || "success";
      this.title = state["title"] || "";
      this.message = state["message"] || "";
      this.details = state["details"] || null;
    }

    this.setUIByType();
  }

  ngOnInit() {
    this.startCountdown();
  }

  ngOnDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  setUIByType() {
    switch (this.type) {
      case "success":
        this.iconName = "checkmark-circle";
        break;
      case "error":
        this.iconName = "close-circle";
        break;
      case "warning":
        this.iconName = "warning";
        break;
    }
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        this.close();
      }
    }, 1000);
  }

  close() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    this.router.navigate(["/scan"]);
  }
}
