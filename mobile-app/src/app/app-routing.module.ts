import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";
import { AuthGuard } from "./guards/auth.guard";

const routes: Routes = [
  {
    path: "",
    redirectTo: "/scan",
    pathMatch: "full",
  },
  {
    path: "scan",
    loadChildren: () =>
      import("./scan/scan.module").then((m) => m.ScanPageModule),
  },
  {
    path: "admin-login",
    loadChildren: () =>
      import("./pages/admin-login/admin-login.module").then(
        (m) => m.AdminLoginPageModule,
      ),
  },
  {
    path: "register",
    loadChildren: () =>
      import("./pages/register/register.module").then(
        (m) => m.RegisterPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "employees",
    loadChildren: () =>
      import("./pages/employees/employees.module").then(
        (m) => m.EmployeesPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "history",
    loadChildren: () =>
      import("./history/history.module").then((m) => m.HistoryPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: "report",
    loadChildren: () =>
      import("./pages/report/report.module").then((m) => m.ReportPageModule),
    canActivate: [AuthGuard],
  },
  {
    path: "company-profile",
    loadChildren: () =>
      import("./pages/company-profile/company-profile.module").then(
        (m) => m.CompanyProfilePageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "manual-checkin",
    loadChildren: () =>
      import("./pages/manual-checkin/manual-checkin.module").then(
        (m) => m.ManualCheckinPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "admin-dashboard",
    loadChildren: () =>
      import("./pages/admin-dashboard/admin-dashboard.module").then(
        (m) => m.AdminDashboardPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "admin-settings",
    loadChildren: () =>
      import("./pages/admin-settings/admin-settings.module").then(
        (m) => m.AdminSettingsPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "test-connection",
    loadChildren: () =>
      import("./pages/test-connection/test-connection.module").then(
        (m) => m.TestConnectionPageModule,
      ),
    canActivate: [AuthGuard],
  },
  {
    path: "notification",
    loadChildren: () =>
      import("./pages/notification/notification.module").then(
        (m) => m.NotificationPageModule,
      ),
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
