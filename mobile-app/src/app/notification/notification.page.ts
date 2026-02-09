import { Component, OnInit, OnDestroy } from "@angular/core";
import { Router, ActivatedRoute } from "@angular/router";

@Component({
  selector: "app-notification",
  templateUrl: "./notification.page.html",
  styleUrls: ["./notification.page.scss"],
})
export class NotificationPage implements OnInit, OnDestroy {
  title: string = "";
  message: string = "";
  type: "success" | "error" | "warning" = "success";
  details: any = null;

  countdown: number = 5;
  private countdownInterval: any;

  // UI Properties
  iconName: string = "checkmark-circle";
  iconClass: string = "icon-success";
  titleClass: string = "title-success";
  buttonColor: string = "success";

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit() {
    // รับข้อมูลจาก navigation state
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state) {
      const state = navigation.extras.state;
      this.title = state["title"] || "แจ้งเตือน";
      this.message = state["message"] || "";
      this.type = state["type"] || "success";
      this.details = state["details"] || null;
    }

    // กำหนด UI ตาม type
    this.setUIByType();

    // เริ่ม countdown 5 วินาที
    this.startCountdown();
  }

  ngOnDestroy() {
    // Clear interval เมื่อออกจากหน้า
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  }

  setUIByType() {
    switch (this.type) {
      case "success":
        this.iconName = "checkmark-circle";
        this.iconClass = "icon-success";
        this.titleClass = "title-success";
        this.buttonColor = "success";
        break;
      case "error":
        this.iconName = "close-circle";
        this.iconClass = "icon-error";
        this.titleClass = "title-error";
        this.buttonColor = "danger";
        break;
      case "warning":
        this.iconName = "warning";
        this.iconClass = "icon-warning";
        this.titleClass = "title-warning";
        this.buttonColor = "warning";
        break;
    }
  }

  startCountdown() {
    this.countdownInterval = setInterval(() => {
      this.countdown--;

      if (this.countdown <= 0) {
        this.close();
      }
    }, 1000); // ทุก 1 วินาที
  }

  close() {
    // Clear interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }

    // กลับไปหน้า scan
    this.router.navigate(["/scan"]);
  }
}
