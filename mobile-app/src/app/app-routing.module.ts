import { NgModule } from "@angular/core";
import { PreloadAllModules, RouterModule, Routes } from "@angular/router";

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
    path: "register",
    loadChildren: () =>
      import("./pages/register/register.module").then(
        (m) => m.RegisterPageModule
      ),
  },
  {
    path: "employees",
    loadChildren: () =>
      import("./pages/employees/employees.module").then(
        (m) => m.EmployeesPageModule
      ),
  },
  {
    path: "history",
    loadChildren: () =>
      import("./history/history.module").then((m) => m.HistoryPageModule),
  },
  {
    path: "manual-checkin",
    loadChildren: () =>
      import("./pages/manual-checkin/manual-checkin.module").then(
        (m) => m.ManualCheckinPageModule
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
