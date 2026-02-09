import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ConfigService } from "@nestjs/config";
import { SupabaseService } from "../../database/supabase.service";
import { EmployeesService } from "../employees/employees.service";
import { AttendanceService } from "../attendance/attendance.service";
import { BatchEmployeeImportDto } from "./dto/batch.dto";

@Injectable()
export class BatchService {
  private readonly logger = new Logger(BatchService.name);

  constructor(
    private supabase: SupabaseService,
    private employeesService: EmployeesService,
    private attendanceService: AttendanceService,
    private configService: ConfigService
  ) {}

  /**
   * Import employees from HR system (batch)
   */
  async importEmployees(batchDto: BatchEmployeeImportDto) {
    const results = {
      total: batchDto.employees.length,
      success: 0,
      failed: 0,
      errors: [] as any[],
    };

    this.logger.log(
      `Starting batch import of ${results.total} employees for company ${batchDto.company_id}`
    );

    // Log sync start
    const syncLog = await this.createSyncLog({
      company_id: batchDto.company_id,
      sync_type: "employees_import",
      direction: "inbound",
      records_total: results.total,
    });

    for (const empData of batchDto.employees) {
      try {
        // Check if employee exists
        const { data: existing } = await this.supabase
          .getClient()
          .from("employees")
          .select("id")
          .eq("company_id", batchDto.company_id)
          .eq("employee_code", empData.employee_code)
          .single();

        if (existing) {
          // Update existing
          await this.supabase
            .getClient()
            .from("employees")
            .update({
              ...empData,
              synced_from_hr: true,
              last_hr_sync: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          // Insert new
          await this.supabase
            .getClient()
            .from("employees")
            .insert({
              company_id: batchDto.company_id,
              ...empData,
              synced_from_hr: true,
              last_hr_sync: new Date().toISOString(),
            });
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          employee_code: empData.employee_code,
          error: error.message,
        });
        this.logger.error(
          `Failed to import employee ${empData.employee_code}:`,
          error
        );
      }
    }

    // Update sync log
    await this.updateSyncLog(syncLog.id, {
      status: "success",
      records_success: results.success,
      records_failed: results.failed,
      response_payload:
        results.errors.length > 0 ? { errors: results.errors } : null,
      completed_at: new Date().toISOString(),
    });

    this.logger.log(
      `Batch import completed: ${results.success} success, ${results.failed} failed`
    );

    return results;
  }

  /**
   * Export attendance to HR system (batch)
   */
  async exportAttendance(companyId: string) {
    this.logger.log(`Starting attendance export for company ${companyId}`);

    // Get unsynced attendance records
    const records = await this.attendanceService.getPendingSync(companyId);

    if (records.length === 0) {
      this.logger.log("No pending attendance records to export");
      return { total: 0, exported: 0, message: "No records to export" };
    }

    // Log sync start
    const syncLog = await this.createSyncLog({
      company_id: companyId,
      sync_type: "attendance_export",
      direction: "outbound",
      records_total: records.length,
    });

    try {
      // TODO: Actual HTTP call to HR system API
      const hrApiUrl = this.configService.get("HR_API_URL");
      const hrApiKey = this.configService.get("HR_API_KEY");

      // Example: await axios.post(`${hrApiUrl}/attendance`, { records }, { headers: { 'X-API-Key': hrApiKey } });

      // For now, just log
      this.logger.log(`Would export ${records.length} records to ${hrApiUrl}`);

      // Mark records as synced
      const recordIds = records.map((r) => r.id);
      await this.attendanceService.markAsSynced(recordIds);

      // Update sync log
      await this.updateSyncLog(syncLog.id, {
        status: "success",
        records_success: records.length,
        completed_at: new Date().toISOString(),
      });

      return {
        total: records.length,
        exported: records.length,
        message: "Export successful",
      };
    } catch (error) {
      // Update sync log with error
      await this.updateSyncLog(syncLog.id, {
        status: "failed",
        error_message: error.message,
        completed_at: new Date().toISOString(),
      });

      this.logger.error("Attendance export failed:", error);
      throw error;
    }
  }

  /**
   * Cron job: Export attendance every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleAttendanceExportCron() {
    this.logger.log("Running scheduled attendance export...");

    // Get all active companies
    const { data: companies } = await this.supabase
      .getClient()
      .from("companies")
      .select("id");

    if (!companies) return;

    for (const company of companies) {
      try {
        await this.exportAttendance(company.id);
      } catch (error) {
        this.logger.error(
          `Failed to export attendance for company ${company.id}:`,
          error
        );
      }
    }
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(companyId: string, limit = 50) {
    const { data, error } = await this.supabase
      .getClient()
      .from("sync_logs")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  /**
   * Helper: Create sync log
   */
  private async createSyncLog(data: any) {
    const { data: log, error } = await this.supabase
      .getClient()
      .from("sync_logs")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return log;
  }

  /**
   * Helper: Update sync log
   */
  private async updateSyncLog(id: string, data: any) {
    const { error } = await this.supabase
      .getClient()
      .from("sync_logs")
      .update(data)
      .eq("id", id);

    if (error) throw error;
  }
}
