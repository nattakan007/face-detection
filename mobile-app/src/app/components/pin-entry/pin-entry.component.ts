import { Component, Input, OnInit } from "@angular/core";
import { ModalController } from "@ionic/angular";

@Component({
  selector: "app-pin-entry",
  templateUrl: "./pin-entry.component.html",
  styleUrls: ["./pin-entry.component.scss"],
})
export class PinEntryComponent implements OnInit {
  @Input() mode: "verify" | "setup" = "verify"; // verify for login, setup for first-time
  @Input() title: string = "ใส่รหัส PIN";

  pin: string = "";
  confirmPin: string = "";
  error: string = "";
  showConfirm: boolean = false;

  constructor(private modalCtrl: ModalController) {}

  ngOnInit() {
    this.showConfirm = this.mode === "setup";
  }

  /**
   * Handle number button press
   */
  onNumberPress(num: string) {
    if (this.showConfirm && this.pin.length >= 6) {
      // Entering confirm PIN
      if (this.confirmPin.length < 6) {
        this.confirmPin += num;
      }
    } else {
      // Entering main PIN
      if (this.pin.length < 6) {
        this.pin += num;
        this.error = "";
      }
    }

    // Auto-submit when PIN is complete (5 digits for default PIN)
    if (this.mode === "verify" && this.pin.length === 5) {
      // Wait a moment for better UX
      setTimeout(() => this.submit(), 300);
    }
  }

  /**
   * Handle backspace
   */
  onBackspace() {
    if (this.showConfirm && this.confirmPin.length > 0) {
      this.confirmPin = this.confirmPin.slice(0, -1);
    } else if (this.pin.length > 0) {
      this.pin = this.pin.slice(0, -1);
    }
    this.error = "";
  }

  /**
   * Submit PIN
   */
  submit() {
    if (this.mode === "setup") {
      // Validate PIN length
      if (this.pin.length < 4 || this.pin.length > 6) {
        this.error = "รหัส PIN ต้องมี 4-6 ตัว";
        return;
      }

      // Check if PINs match
      if (this.pin !== this.confirmPin) {
        this.error = "รหัส PIN ไม่ตรงกัน";
        this.confirmPin = "";
        return;
      }

      // Return the new PIN
      this.modalCtrl.dismiss({ pin: this.pin }, "confirm");
    } else {
      // Verify mode - return entered PIN
      if (this.pin.length >= 4) {
        this.modalCtrl.dismiss({ pin: this.pin }, "confirm");
      }
    }
  }

  /**
   * Cancel PIN entry
   */
  cancel() {
    this.modalCtrl.dismiss(null, "cancel");
  }

  /**
   * Get masked PIN display
   */
  getPinDisplay(value: string): string {
    return "•".repeat(value.length);
  }

  /**
   * Check if submit button should be enabled
   */
  canSubmit(): boolean {
    if (this.mode === "setup") {
      return (
        this.pin.length >= 4 &&
        this.pin.length <= 6 &&
        this.confirmPin.length >= 4
      );
    }
    return this.pin.length >= 4;
  }
}
