import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { StorageService } from "../../services/storage.service";
import { ToastController, AlertController } from "@ionic/angular";

interface CompanyProfile {
  name: string;
  businessType: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
  workStartTime: string;
  workEndTime: string;
  lateTime: string;
  workDays: number[];
}

@Component({
  selector: "app-company-profile",
  templateUrl: "./company-profile.page.html",
  styleUrls: ["./company-profile.page.scss"],
})
export class CompanyProfilePage implements OnInit {
  company: CompanyProfile = {
    name: "SAILOR BAR & RESTAURANT",
    businessType: "restaurant",
    address: "",
    phone: "",
    email: "",
    logoUrl: "",
    workStartTime: "08:00",
    workEndTime: "17:00",
    lateTime: "08:15",
    workDays: [1, 2, 3, 4, 5], // Mon-Fri
  };

  isSaving = false;

  weekDays = [
    { value: 0, label: "อา." },
    { value: 1, label: "จ." },
    { value: 2, label: "อ." },
    { value: 3, label: "พ." },
    { value: 4, label: "พฤ." },
    { value: 5, label: "ศ." },
    { value: 6, label: "ส." },
  ];

  constructor(
    private router: Router,
    private storage: StorageService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
  ) {}

  async ngOnInit() {
    await this.loadProfile();
  }

  async loadProfile() {
    try {
      const saved = await this.storage.get<CompanyProfile>("company_profile");
      if (saved) {
        this.company = { ...this.company, ...saved };
      }
    } catch (error) {
      console.error("Error loading company profile:", error);
    }
  }

  toggleWorkDay(day: number) {
    const index = this.company.workDays.indexOf(day);
    if (index > -1) {
      this.company.workDays.splice(index, 1);
    } else {
      this.company.workDays.push(day);
      this.company.workDays.sort();
    }
  }

  async changeLogo() {
    // For now, use file input
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";

    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
        this.company.logoUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    };

    input.click();
  }

  async saveProfile() {
    if (!this.company.name.trim()) {
      const toast = await this.toastCtrl.create({
        message: "กรุณากรอกชื่อบริษัท",
        color: "warning",
        duration: 2000,
      });
      await toast.present();
      return;
    }

    this.isSaving = true;

    try {
      await this.storage.set("company_profile", this.company);

      const toast = await this.toastCtrl.create({
        message: "บันทึกข้อมูลบริษัทเรียบร้อยแล้ว",
        color: "success",
        duration: 2000,
      });
      await toast.present();
    } catch (error) {
      const toast = await this.toastCtrl.create({
        message: "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่",
        color: "danger",
        duration: 2000,
      });
      await toast.present();
    } finally {
      this.isSaving = false;
    }
  }
}
