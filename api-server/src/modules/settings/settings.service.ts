import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import { Settings } from "./settings.interface";

@Injectable()
export class SettingsService {
  constructor(private supabase: SupabaseService) {}

  async getSettings(companyId: string): Promise<Settings> {
    const { data, error } = await this.supabase
      .getClient()
      .from("settings")
      .select("*")
      .eq("company_id", companyId)
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Settings for company ${companyId} not found`
      );
    }

    return data;
  }

  async updateSettings(
    companyId: string,
    updateData: Partial<Settings>
  ): Promise<Settings> {
    const { data, error } = await this.supabase
      .getClient()
      .from("settings")
      .update(updateData)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(
        `Settings for company ${companyId} not found`
      );
    }

    return data;
  }
}
