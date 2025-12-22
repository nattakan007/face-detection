import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";
import { ScanPage } from "./scan.page";
import { SettingsMenuPopover } from "./settings-menu.popover";
import { ComponentsModule } from "../components/components.module";

import { ScanPageRoutingModule } from "./scan-routing.module";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScanPageRoutingModule,
    ComponentsModule,
  ],
  declarations: [ScanPage, SettingsMenuPopover],
})
export class ScanPageModule {}
