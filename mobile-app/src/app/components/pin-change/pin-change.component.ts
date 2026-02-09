import { Component } from "@angular/core";
import { ModalController, AlertController } from "@ionic/angular";
import { AuthService } from "../../services/auth.service";

@Component({
  selector: "app-pin-change",
  templateUrl: "./pin-change.component.html",
  styleUrls: ["./pin-change.component.scss"],
})
export class PinChangeComponent {
  oldPin: string = "";
  newPin: string = "";
  confirmPin: string = "";
  error: string = "";

  constructor(
    private modalCtrl: ModalController,
    private authService: AuthService,
    private alertController: AlertController
  ) {}

  /**
   * Submit PIN change
   */
  async submit() {
    this.error = "";

    // Validate new PIN
    if (this.newPin.length < 4 || this.newPin.length > 6) {
      this.error = "รหัส PIN ใหม่ต้องมี 4-6 ตัว";
      return;
    }

    if (!/^\d+$/.test(this.newPin)) {
      this.error = "รหัส PIN ต้องเป็นตัวเลขเท่านั้น";
      return;
    }

    // Check if new PIN matches confirm
    if (this.newPin !== this.confirmPin) {
      this.error = "รหัส PIN ใหม่ไม่ตรงกัน";
      return;
    }

    // Check if new PIN is same as old PIN
    if (this.oldPin === this.newPin) {
      this.error = "รหัส PIN ใหม่ต้องต่างจากรหัสเดิม";
      return;
    }

    // Verify old PIN and set new PIN
    const success = await this.authService.changePin(this.oldPin, this.newPin);

    if (success) {
      // Show success message
      const alert = await this.alertController.create({
        header: "สำเร็จ",
        message: "เปลี่ยนรหัส PIN เรียบร้อยแล้ว",
        buttons: ["ตกลง"],
      });
      await alert.present();

      this.modalCtrl.dismiss({ success: true }, "confirm");
    } else {
      this.error = "รหัส PIN เดิมไม่ถูกต้อง";
    }
  }

  /**
   * Cancel PIN change
   */
  cancel() {
    this.modalCtrl.dismiss(null, "cancel");
  }
}
