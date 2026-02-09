import { Injectable, NotFoundException } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  RegisterFaceDto,
} from "./dto/employee.dto";
import { Employee } from "./employee.interface";

@Injectable()
export class EmployeesService {
  constructor(private supabase: SupabaseService) {}

  async findAll(companyId: string): Promise<Employee[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string): Promise<Employee> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return data;
  }

  async create(createDto: CreateEmployeeDto): Promise<Employee> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .insert(createDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updateDto: UpdateEmployeeDto): Promise<Employee> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .update(updateDto)
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    // Soft delete - set is_active to false
    const { error } = await this.supabase
      .getClient()
      .from("employees")
      .update({ is_active: false })
      .eq("id", id);

    if (error) throw error;
  }

  async registerFace(id: string, faceDto: RegisterFaceDto): Promise<Employee> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .update({
        face_descriptor: faceDto.faceDescriptor,
        face_vector: `[${faceDto.faceDescriptor.join(",")}]`, // Convert to pgvector format
      })
      .eq("id", id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    return data;
  }

  async findWithoutFace(companyId: string): Promise<Employee[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .is("face_descriptor", null)
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async search(companyId: string, query: string): Promise<Employee[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("employees")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .or(
        `name.ilike.%${query}%,employee_code.ilike.%${query}%,department.ilike.%${query}%`
      )
      .order("name", { ascending: true });

    if (error) throw error;
    return data || [];
  }
}
