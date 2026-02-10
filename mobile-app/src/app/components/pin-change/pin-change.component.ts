import { Component } from "@angular/core";
import { ModalController, AlertController } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-pin-change",
  templateUrl: "./pin-change.component.html",
  styleUrls: ["./pin-change.component.scss"],
})
export class PinChangeComponent {
  currentPassword: string = "";
  newUsername: string = "";
  newPassword: string = "";
  confirmPassword: string = "";
  showCurrentPassword: boolean = false;
  showNewPassword: boolean = false;
  error: string = "";

  constructor(
    private modalCtrl: ModalController,
    private authService: AuthService,
    private alertController: AlertController,
  ) {}

  async ngOnInit() {
    // Pre-fill current username
    this.newUsername = await this.authService.getCompanyName();
  }

  /**
   * Submit credential change
   */
  async submit() {
    this.error = "";

    if (!this.newUsername || this.newUsername.trim().length === 0) {
      this.error = "กรุณาระบุชื่อผู้ใช้ / บริษัท";
      return;
    }

    if (this.newPassword.length < 4) {
      this.error = "รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร";
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.error = "รหัสผ่านใหม่ไม่ตรงกัน";
      return;
    }

    const success = await this.authService.changeCredentials(
      this.currentPassword,
      this.newUsername,
      this.newPassword,
    );

    if (success) {
      const alert = await this.alertController.create({
        header: "สำเร็จ",
        message: "เปลี่ยนข้อมูลเข้าสู่ระบบเรียบร้อยแล้ว",
        buttons: ["ตกลง"],
      });
      await alert.present();

      this.modalCtrl.dismiss({ success: true }, "confirm");
    } else {
      this.error = "รหัสผ่านปัจจุบันไม่ถูกต้อง";
    }
  }

  /**
   * Cancel
   */
  cancel() {
    this.modalCtrl.dismiss(null, "cancel");
  }
}
