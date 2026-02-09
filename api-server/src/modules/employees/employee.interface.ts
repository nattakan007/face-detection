export interface Employee {
  id: string;
  company_id: string;
  employee_code: string;
  name: string;
  position?: string;
  department?: string;
  email?: string;
  phone?: string;
  face_vector?: number[];
  face_descriptor?: number[];
  synced_from_hr?: boolean;
  hr_sync_id?: string;
  last_hr_sync?: Date;
  is_active?: boolean;
  created_at?: Date;
  updated_at?: Date;
}
