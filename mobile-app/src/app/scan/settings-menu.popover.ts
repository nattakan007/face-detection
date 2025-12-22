import { Component } from '@angular/core';
import { PopoverController } from '@ionic/angular';

@Component({
  templateUrl: 'settings-menu.popover.html'
})
export class SettingsMenuPopover {
  isOfflineMode: boolean = false;
  isLoading: boolean = false;
  refreshFromApi?: () => void;

  constructor(
    private popoverController: PopoverController
  ) {}

  async onRefreshFromApi() {
    if (this.refreshFromApi) {
      await this.refreshFromApi();
    }
    this.closePopover();
  }

  async closePopover() {
    await this.popoverController.dismiss();
  }
}