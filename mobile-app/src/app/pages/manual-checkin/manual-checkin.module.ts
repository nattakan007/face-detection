import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { ManualCheckinPageRoutingModule } from "./manual-checkin-routing.module";
import { ManualCheckinPage } from "./manual-checkin.page";
import { ComponentsModule } from "../../components/components.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ManualCheckinPageRoutingModule,
    ComponentsModule,
  ],
  declarations: [ManualCheckinPage],
})
export class ManualCheckinPageModule {}
