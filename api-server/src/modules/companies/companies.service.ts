import { Injectable } from "@nestjs/common";
import { SupabaseService } from "../../database/supabase.service";
import { CreateCompanyDto, UpdateCompanyDto } from "./dto/company.dto";
import { Company } from "./companies.interface";

@Injectable()
export class CompaniesService {
  constructor(private supabase: SupabaseService) {}

  /**
   * Get all companies
   */
  async findAll(): Promise<Company[]> {
    const { data, error } = await this.supabase
      .getClient()
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get company by ID
   */
  async findOne(id: string): Promise<Company> {
    const { data, error } = await this.supabase
      .getClient()
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Create new company
   */
  async create(createDto: CreateCompanyDto): Promise<Company> {
    const { data, error } = await this.supabase
      .getClient()
      .from("companies")
      .insert(createDto)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update company
   */
  async update(id: string, updateDto: UpdateCompanyDto): Promise<Company> {
    const { data, error } = await this.supabase
      .getClient()
      .from("companies")
      .update(updateDto)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete company
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .getClient()
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
}
