import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { FormsModule } from "@angular/forms";
import { LiveCameraComponent } from "./live-camera/live-camera.component";
import { PinEntryComponent } from "./pin-entry/pin-entry.component";
import { PinChangeComponent } from "./pin-change/pin-change.component";

@NgModule({
  imports: [CommonModule, IonicModule, FormsModule],
  declarations: [LiveCameraComponent, PinEntryComponent, PinChangeComponent],
  exports: [LiveCameraComponent, PinEntryComponent, PinChangeComponent],
})
export class ComponentsModule {}
