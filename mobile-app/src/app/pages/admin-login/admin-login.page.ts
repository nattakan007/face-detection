import { Component, OnInit, ViewChild, ElementRef } from "@angular/core";
import { Router } from "@angular/router";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-admin-login",
  templateUrl: "./admin-login.page.html",
  styleUrls: ["./admin-login.page.scss"],
})
export class AdminLoginPage implements OnInit {
  @ViewChild("passwordInput") passwordInput!: ElementRef;

  username: string = "";
  password: string = "";
  showPassword: boolean = false;
  isError: boolean = false;
  isSuccess: boolean = false;
  isProcessing: boolean = false;
  errorMessage: string = "";

  constructor(private router: Router, private authService: AuthService) {}

  async ngOnInit() {
    // Check if already authenticated
    const isAuth = await this.authService.isAuthenticated();
    if (isAuth) {
      this.router.navigate(["/admin-dashboard"]);
    }
  }

  focusPassword() {
    if (this.passwordInput?.nativeElement) {
      this.passwordInput.nativeElement.focus();
    }
  }

  async login() {
    if (this.isProcessing || !this.username || !this.password) return;

    this.isProcessing = true;
    this.isError = false;
    this.errorMessage = "";

    try {
      const isValid = await this.authService.verifyCredentials(
        this.username,
        this.password,
      );

      if (isValid) {
        this.isSuccess = true;
        setTimeout(() => {
          this.router.navigate(["/admin-dashboard"]);
        }, 500);
      } else {
        this.isError = true;
        this.errorMessage = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
        setTimeout(() => {
          this.isError = false;
        }, 2000);
      }
    } catch (error) {
      this.isError = true;
      this.errorMessage = "เกิดข้อผิดพลาด กรุณาลองใหม่";
    } finally {
      this.isProcessing = false;
    }
  }

  goBack() {
    this.router.navigate(["/scan"]);
  }
}
