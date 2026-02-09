import { Controller, Get, Put, Body, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { Settings } from "./settings.interface";

@ApiTags("settings")
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get company settings" })
  @ApiResponse({ status: 200, description: "Settings found" })
  @ApiResponse({ status: 404, description: "Settings not found" })
  async getSettings(@Query("company_id") companyId: string) {
    return this.settingsService.getSettings(companyId);
  }

  @Put()
  @ApiOperation({ summary: "Update company settings" })
  @ApiResponse({ status: 200, description: "Settings updated" })
  @ApiResponse({ status: 404, description: "Settings not found" })
  async updateSettings(
    @Query("company_id") companyId: string,
    @Body() updateData: Partial<Settings>
  ) {
    return this.settingsService.updateSettings(companyId, updateData);
  }
}
