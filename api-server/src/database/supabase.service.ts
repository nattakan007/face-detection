import { Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const supabaseKey = this.configService.get<string>(
      "SUPABASE_SERVICE_ROLE_KEY"
    );

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase credentials are not configured");
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("✅ Supabase client initialized");
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  // Helper methods for common operations
  async query(table: string) {
    return this.supabase.from(table);
  }
}
