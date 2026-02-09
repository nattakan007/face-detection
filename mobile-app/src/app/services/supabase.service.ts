import { Injectable } from "@angular/core";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable({
  providedIn: "root",
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private isConnected = false;

  constructor() {
    const supabaseUrl = "https://zjyrciehnvjouakzvwxk.supabase.co";
    const supabaseAnonKey =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJjaWVobnZqb3Vha3p2d3hrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyOTE1MDksImV4cCI6MjA4Mzg2NzUwOX0.YRDix5ZGiIaKjuPThSoViWORpkscVxjnbaihGro9uzs";

    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.checkConnection();
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Check if Supabase is reachable
   */
  async checkConnection(): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from("companies")
        .select("count")
        .limit(1);

      this.isConnected = !error;
      return this.isConnected;
    } catch {
      this.isConnected = false;
      return false;
    }
  }

  isOnline(): boolean {
    return this.isConnected && navigator.onLine;
  }

  /**
   * Sync attendance record to Supabase
   */
  async syncAttendanceRecord(
    record: any
  ): Promise<{ success: boolean; error?: any }> {
    try {
      const { error } = await this.supabase.from("attendance").insert({
        employee_id: record.employeeId || null,
        company_id: record.companyId || "00000000-0000-0000-0000-000000000000", // Default company
        check_in_time: record.checkInTime,
        check_out_time: record.checkOutTime || null,
        check_in_location: record.checkInLocation
          ? JSON.stringify(record.checkInLocation)
          : null,
        check_out_location: record.checkOutLocation
          ? JSON.stringify(record.checkOutLocation)
          : null,
        face_descriptor: record.faceDescriptor || null,
        type: record.type || "face_scan",
        manual_name: record.manualName || null,
      });

      if (error) {
        console.error("Supabase attendance sync error:", error);
        return { success: false, error };
      }

      console.log("✅ Attendance synced to Supabase");
      return { success: true };
    } catch (error) {
      console.error("Attendance sync exception:", error);
      return { success: false, error };
    }
  }

  /**
   * Sync employee profile to Supabase
   */
  async syncEmployeeProfile(
    profile: any
  ): Promise<{ success: boolean; error?: any }> {
    try {
      // Check if employee exists
      const { data: existing } = await this.supabase
        .from("employees")
        .select("id")
        .eq("employee_code", profile.employeeCode)
        .single();

      const employeeData = {
        company_id: profile.companyId || "00000000-0000-0000-0000-000000000000",
        employee_code: profile.employeeCode,
        name: profile.name,
        face_descriptor: profile.faceDescriptor,
        face_vector: profile.faceDescriptor, // pgvector will auto-convert
      };

      let error;
      if (existing) {
        // Update existing
        ({ error } = await this.supabase
          .from("employees")
          .update(employeeData)
          .eq("id", existing.id));
      } else {
        // Insert new
        ({ error } = await this.supabase
          .from("employees")
          .insert(employeeData));
      }

      if (error) {
        console.error("Supabase profile sync error:", error);
        return { success: false, error };
      }

      console.log("✅ Employee profile synced to Supabase");
      return { success: true };
    } catch (error) {
      console.error("Profile sync exception:", error);
      return { success: false, error };
    }
  }

  /**
   * Get all companies from Supabase
   */
  async getCompanies(): Promise<any[]> {
    try {
      const { data, error } = await this.supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Get companies error:", error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error("Get companies exception:", error);
      return [];
    }
  }

  /**
   * Get default company (first one) or create if none exists
   */
  async getOrCreateDefaultCompany(): Promise<string> {
    try {
      // Try to get first company
      const { data: companies } = await this.supabase
        .from("companies")
        .select("id")
        .limit(1);

      if (companies && companies.length > 0) {
        return companies[0].id;
      }

      // No companies exist, create default
      const { data: newCompany, error } = await this.supabase
        .from("companies")
        .insert({
          name: "บริษัทเริ่มต้น",
          code: "DEFAULT001",
        })
        .select("id")
        .single();

      if (error || !newCompany) {
        console.error("Create default company error:", error);
        return "00000000-0000-0000-0000-000000000000"; // Fallback UUID
      }

      return newCompany.id;
    } catch (error) {
      console.error("Get/create company exception:", error);
      return "00000000-0000-0000-0000-000000000000";
    }
  }
}
