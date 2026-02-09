import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-admin-login",
  templateUrl: "./admin-login.page.html",
  styleUrls: ["./admin-login.page.scss"],
})
export class AdminLoginPage implements OnInit {
  pin: string = "";
  pinLength: number = 6;
  pinDots: number[] = [];
  isError: boolean = false;
  isSuccess: boolean = false;
  isProcessing: boolean = false;
  errorMessage: string = "";

  numpadRows = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "backspace"],
  ];

  constructor(private router: Router, private authService: AuthService) {}

  async ngOnInit() {
    this.pinDots = Array(this.pinLength).fill(0);

    // Check if already authenticated
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      this.router.navigate(["/admin-dashboard"]);
    }
  }

  async onKeyPress(key: string) {
    if (this.isProcessing) return;

    if (key === "backspace") {
      this.pin = this.pin.slice(0, -1);
      this.isError = false;
      this.errorMessage = "";
      return;
    }

    if (this.pin.length >= this.pinLength) return;

    this.pin += key;
    this.isError = false;
    this.errorMessage = "";

    // Auto-submit when PIN is complete
    if (this.pin.length === this.pinLength) {
      await this.verifyPin();
    }
  }

  async verifyPin() {
    this.isProcessing = true;

    try {
      const isValid = await this.authService.verifyPin(this.pin);

      if (isValid) {
        this.isSuccess = true;
        // Short delay for animation
        setTimeout(() => {
          this.router.navigate(["/admin-dashboard"]);
        }, 500);
      } else {
        this.isError = true;
        this.errorMessage = "รหัส PIN ไม่ถูกต้อง";
        // Shake animation then clear
        setTimeout(() => {
          this.pin = "";
          this.isError = false;
        }, 1000);
      }
    } catch (error) {
      this.isError = true;
      this.errorMessage = "เกิดข้อผิดพลาด กรุณาลองใหม่";
      this.pin = "";
    } finally {
      this.isProcessing = false;
    }
  }

  goBack() {
    this.router.navigate(["/scan"]);
  }
}
