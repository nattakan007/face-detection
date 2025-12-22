import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage implements OnInit {

  userProfile: any = null;
  todayStats: any = null;
  todayAttendance: any = null;
  recentActivities: any[] = [];

  constructor(
    private router: Router,
    private storage: StorageService
  ) {}

  async ngOnInit() {
    await this.loadUserData();
    await this.loadTodayStats();
    await this.loadTodayAttendance();
    this.loadRecentActivities();
  }

  async loadUserData() {
    this.userProfile = await this.storage.getUserProfile();
  }

  async loadTodayStats() {
    // TODO: Calculate from attendance records
    this.todayStats = {
      workDays: 22,
      present: 18,
      late: 2,
      absent: 0
    };
  }

  async loadTodayAttendance() {
    // TODO: Get today's attendance
    const records = await this.storage.getTodayAttendance();

    this.todayAttendance = {
      checkIn: records.find(r => r.type === 'check-in')?.time || null,
      checkOut: records.find(r => r.type === 'check-out')?.time || null
    };
  }

  loadRecentActivities() {
    // TODO: Get from API
    this.recentActivities = [
      {
        id: 1,
        title: 'Check In - Office',
        time: '08:45 AM',
        icon: 'log-in-outline',
        status: 'Success',
        color: 'success'
      },
      {
        id: 2,
        title: 'Check Out - Office',
        time: '06:15 PM',
        icon: 'log-out-outline',
        status: 'Completed',
        color: 'success'
      },
      {
        id: 3,
        title: 'Leave Request Approved',
        time: 'Yesterday',
        icon: 'calendar-outline',
        status: 'Approved',
        color: 'success'
      }
    ];
  }

  navigateTo(path: string) {
    this.router.navigate([path]);
  }

  showNotifications() {
    // TODO: Navigate to notifications page
    console.log('Show notifications');
  }

  trackById(index: number, activity: any) {
    return activity.id;
  }

}