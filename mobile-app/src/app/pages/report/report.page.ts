import { Component, OnInit } from "@angular/core";
import {
  StorageService,
  AttendanceRecord,
  UserProfile,
} from "../../services/storage.service";
import { SettingsService } from "../../services/settings.service";

interface EmployeeReport {
  name: string;
  employeeId: string;
  department: string;
  photoPath: string;
  checkInCount: number;
  checkOutCount: number;
  lateCount: number;
}

interface ReportSummary {
  totalEmployees: number;
  totalCheckIns: number;
  totalCheckOuts: number;
  lateCount: number;
}

@Component({
  selector: "app-report",
  templateUrl: "./report.page.html",
  styleUrls: ["./report.page.scss"],
})
export class ReportPage implements OnInit {
  startDate: string = "";
  endDate: string = "";
  today: string = "";
  activeFilter: string = "today";
  searchTerm: string = "";

  summary: ReportSummary = {
    totalEmployees: 0,
    totalCheckIns: 0,
    totalCheckOuts: 0,
    lateCount: 0,
  };

  employeeReports: EmployeeReport[] = [];
  filteredEmployeeReports: EmployeeReport[] = [];
  recentRecords: AttendanceRecord[] = [];

  private allRecords: AttendanceRecord[] = [];
  private allEmployees: UserProfile[] = [];
  private lateTime: string = "08:15";

  constructor(
    private storage: StorageService,
    private settingsService: SettingsService,
  ) {}

  async ngOnInit() {
    const now = new Date();
    this.today = now.toISOString().split("T")[0];
    this.startDate = this.today;
    this.endDate = this.today;

    // Load settings
    try {
      const settings = await this.settingsService.getSettings();
      this.lateTime = settings.lateTime || "08:15";
    } catch (e) {
      // Use default
    }

    await this.loadData();
  }

  async loadData() {
    this.allRecords = await this.storage.getAttendanceRecords();
    this.allEmployees = await this.storage.getAllUsers();
    this.generateReport();
  }

  setQuickFilter(filter: string) {
    this.activeFilter = filter;
    const now = new Date();

    switch (filter) {
      case "today":
        this.startDate = this.today;
        this.endDate = this.today;
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        this.startDate = weekStart.toISOString().split("T")[0];
        this.endDate = this.today;
        break;
      case "month":
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        this.startDate = monthStart.toISOString().split("T")[0];
        this.endDate = this.today;
        break;
      case "all":
        this.startDate = "2020-01-01";
        this.endDate = this.today;
        break;
    }

    this.generateReport();
  }

  onDateChange() {
    this.activeFilter = "";
    this.generateReport();
  }

  generateReport() {
    // Filter records by date range
    const startTs = new Date(this.startDate).setHours(0, 0, 0, 0);
    const endTs = new Date(this.endDate).setHours(23, 59, 59, 999);

    const filteredRecords = this.allRecords.filter((r) => {
      return r.timestamp >= startTs && r.timestamp <= endTs;
    });

    // Summary
    this.summary.totalEmployees = this.allEmployees.length;
    this.summary.totalCheckIns = filteredRecords.filter(
      (r) => r.type === "check-in",
    ).length;
    this.summary.totalCheckOuts = filteredRecords.filter(
      (r) => r.type === "check-out",
    ).length;

    // Calculate late count
    this.summary.lateCount = filteredRecords.filter((r) => {
      if (r.type !== "check-in") return false;
      return this.isLate(r.time);
    }).length;

    // Employee reports
    const empMap = new Map<string, EmployeeReport>();

    for (const emp of this.allEmployees) {
      empMap.set(emp.id || emp.employeeId, {
        name: emp.name,
        employeeId: emp.employeeId,
        department: emp.department || "",
        photoPath: emp.photoPath || "",
        checkInCount: 0,
        checkOutCount: 0,
        lateCount: 0,
      });
    }

    for (const record of filteredRecords) {
      const key = record.employeeId || "unknown";
      if (!empMap.has(key)) {
        empMap.set(key, {
          name: record.employeeName || "ไม่ระบุ",
          employeeId: record.employeeId || "",
          department: "",
          photoPath: "",
          checkInCount: 0,
          checkOutCount: 0,
          lateCount: 0,
        });
      }

      const emp = empMap.get(key)!;
      if (record.type === "check-in") {
        emp.checkInCount++;
        if (this.isLate(record.time)) {
          emp.lateCount++;
        }
      } else {
        emp.checkOutCount++;
      }
    }

    this.employeeReports = Array.from(empMap.values())
      .filter((e) => e.checkInCount > 0 || e.checkOutCount > 0)
      .sort((a, b) => b.checkInCount - a.checkInCount);

    this.filteredEmployeeReports = [...this.employeeReports];

    // Recent records (last 20)
    this.recentRecords = filteredRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }

  filterEmployees() {
    if (!this.searchTerm) {
      this.filteredEmployeeReports = [...this.employeeReports];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredEmployeeReports = this.employeeReports.filter(
      (emp) =>
        emp.name.toLowerCase().includes(term) ||
        emp.employeeId.toLowerCase().includes(term),
    );
  }

  private isLate(timeStr: string): boolean {
    if (!timeStr) return false;
    try {
      // Parse Thai time format (e.g., "08:45:00" or "8:45:00")
      const timeParts = timeStr.split(":");
      const hour = parseInt(timeParts[0], 10);
      const minute = parseInt(timeParts[1], 10);

      const lateParts = this.lateTime.split(":");
      const lateHour = parseInt(lateParts[0], 10);
      const lateMinute = parseInt(lateParts[1], 10);

      if (hour > lateHour) return true;
      if (hour === lateHour && minute > lateMinute) return true;
      return false;
    } catch {
      return false;
    }
  }

  async onRefresh(event: any) {
    await this.loadData();
    event.target.complete();
  }
}
