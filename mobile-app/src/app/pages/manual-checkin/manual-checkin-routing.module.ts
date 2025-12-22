import { NgModule } from "@angular/core";
import { Routes, RouterModule } from "@angular/router";
import { ManualCheckinPage } from "./manual-checkin.page";

const routes: Routes = [
  {
    path: "",
    component: ManualCheckinPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ManualCheckinPageRoutingModule {}
