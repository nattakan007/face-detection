import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IonicModule } from "@ionic/angular";
import { TestConnectionPageRoutingModule } from "./test-connection-routing.module";
import { TestConnectionPage } from "./test-connection.page";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    TestConnectionPageRoutingModule,
  ],
  declarations: [TestConnectionPage],
})
export class TestConnectionPageModule {}
