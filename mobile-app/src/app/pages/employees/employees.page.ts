import { Component, OnInit } from '@angular/core';
import { StorageService } from '../../services/storage.service';
import { UserProfile } from '../../services/storage.service';

@Component({
  selector: 'app-employees',
  templateUrl: './employees.page.html',
  styleUrls: ['./employees.page.scss'],
})
export class EmployeesPage implements OnInit {
  employees: UserProfile[] = [];
  isLoading = true;

  constructor(private storage: StorageService) { }

  async ngOnInit() {
    await this.loadEmployees();
  }

  async loadEmployees() {
    this.isLoading = true;
    try {
      const allUsers = await this.storage.getAllUsers();
      this.employees = allUsers;
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async doRefresh(event: any) {
    await this.loadEmployees();
    event.target.complete();
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  employeesWithPhoto(): number {
    return this.employees.filter(e => e.photoPath).length;
  }
}
