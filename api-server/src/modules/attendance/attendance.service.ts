import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import {
  CheckInDto,
  CheckOutDto,
  GetAttendanceQueryDto,
} from "./dto/attendance.dto";
import { Attendance } from "./attendance.interface";

@Injectable()
export class AttendanceService {
  constructor(private supabase: SupabaseService) {}

  async checkIn(checkInDto: CheckInDto): Promise<Attendance> {
    const data: any = {
      company_id: checkInDto.company_id,
      employee_id: checkInDto.employee_id,
      check_in: new Date().toISOString(),
      check_in_location: checkInDto.location,
      check_in_confidence: checkInDto.confidence,
      type: checkInDto.type || "face-scan",
      manual_name: checkInDto.manual_name,
    };

    const { data: result, error } = await this.supabase
      .getClient()
      .from("attendance")
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  async checkOut(id: string, checkOutDto: CheckOutDto): Promise<Attendance> {
    const data: any = {
      check_out: new Date().toISOString(),
      check_out_location: checkOutDto.location,
      check_out_confidence: checkOutDto.confidence,
    };

    const { data: result, error } = await this.supabase
      .getClient()
      .from("attendance")
      .update(data)
      .eq("id", id)
      .select()
      .single();

    if (error || !result) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    return result;
  }

  async findAll(query: GetAttendanceQueryDto): Promise<Attendance[]> {
    let queryBuilder = this.supabase
      .getClient()
      .from("attendance")
      .select("*")
      .eq("company_id", query.company_id);

    if (query.employee_id) {
      queryBuilder = queryBuilder.eq("employee_id", query.employee_id);
    }

    if (query.start_date) {
      queryBuilder = queryBuilder.gte("check_in", query.start_date);
    }

    if (query.end_date) {
      queryBuilder = queryBuilder.lte("check_in", query.end_date);
    }

    if (query.type) {
      queryBuilder = queryBuilder.eq("type", query.type);
    }

    const { data, error } = await queryBuilder.order("check_in", {
      ascending: false,
    });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string): Promise<Attendance> {
    const { data, error } = await this.supabase
      .getClient()
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Attendance record with ID ${id} not found`);
    }

    return data;
  }

  async getToday(companyId: string): Promise<Attendance[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await this.supabase
      .getClient()
      .from("attendance")
      .select("*")
      .eq("company_id", companyId)
      .gte("check_in", today.toISOString())
      .lt("check_in", tomorrow.toISOString())
      .order("check_in", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getEmployeeHistory(
    companyId: string,
    employeeId: string
  ): Promise<Attendance[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("attendance")
      .select("*")
      .eq("company_id", companyId)
      .eq("employee_id", employeeId)
      .order("check_in", { ascending: false })
      .limit(30);

    if (error) throw error;
    return data || [];
  }

  async getPendingSync(companyId: string): Promise<Attendance[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("attendance")
      .select("*")
      .eq("company_id", companyId)
      .eq("synced_to_hr", false)
      .order("check_in", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async markAsSynced(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from("attendance")
      .update({
        synced_to_hr: true,
        last_hr_sync: new Date().toISOString(),
      })
      .in("id", ids);

    if (error) throw error;
  }
}
