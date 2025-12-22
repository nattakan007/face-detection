import { Component, OnInit } from "@angular/core";
import {
  StorageService,
  AttendanceRecord,
  UserProfile,
} from "../services/storage.service";

@Component({
  selector: "app-history",
  templateUrl: "history.page.html",
  styleUrls: ["history.page.scss"],
})
export class HistoryPage implements OnInit {
  attendanceRecords: AttendanceRecord[] = [];
  filteredRecords: AttendanceRecord[] = [];
  todayRecords: AttendanceRecord[] = [];
  employees: UserProfile[] = [];
  selectedEmployeeId: string = "all";

  constructor(private storage: StorageService) {}

  async ngOnInit() {
    await this.loadRecords();
    await this.loadEmployees();
  }

  async ionViewWillEnter() {
    await this.loadRecords();
  }

  async loadRecords() {
    this.attendanceRecords = await this.storage.getAttendanceRecords();
    this.todayRecords = await this.storage.getTodayAttendance();
    this.applyFilter();
  }

  async loadEmployees() {
    this.employees = await this.storage.getAllUsers();
  }

  applyFilter() {
    if (this.selectedEmployeeId === "all") {
      this.filteredRecords = [...this.attendanceRecords];
    } else {
      this.filteredRecords = this.attendanceRecords.filter(
        (record) =>
          record.employeeId === this.selectedEmployeeId ||
          record.employeeName === this.getEmployeeName(this.selectedEmployeeId)
      );
    }
  }

  onEmployeeFilterChange(event: any) {
    this.selectedEmployeeId = event.detail.value;
    this.applyFilter();
  }

  getEmployeeName(employeeId: string): string {
    const emp = this.employees.find((e) => e.id === employeeId);
    return emp?.name || "";
  }

  getRecordIcon(type: string): string {
    return type === "check-in" ? "log-in" : "log-out";
  }

  getRecordColor(type: string): string {
    return type === "check-in" ? "success" : "warning";
  }

  getRecordTitle(type: string): string {
    return type === "check-in" ? "เข้างาน" : "ออกงาน";
  }

  /**
   * Get status label for attendance record
   */
  getStatusLabel(record: AttendanceRecord): string {
    if (record.employeeId?.startsWith("MANUAL-")) {
      return "ด้วยตนเอง";
    } else if (record.confidence && record.confidence >= 0.6) {
      return "ตรง";
    } else if (record.confidence) {
      return "ไม่ตรง";
    }
    return "";
  }

  async ionRefresh(event: any) {
    await this.loadRecords();
    await this.loadEmployees();
    event.target.complete();
  }

  trackByDate(index: number, record: AttendanceRecord) {
    return record.id;
  }
}
