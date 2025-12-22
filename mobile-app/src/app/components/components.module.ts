import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { IonicModule } from "@ionic/angular";
import { LiveCameraComponent } from "./live-camera/live-camera.component";

@NgModule({
  imports: [CommonModule, IonicModule],
  declarations: [LiveCameraComponent],
  exports: [LiveCameraComponent],
})
export class ComponentsModule {}
