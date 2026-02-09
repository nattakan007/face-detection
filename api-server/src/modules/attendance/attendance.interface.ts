export interface Attendance {
  id: string;
  company_id: string;
  employee_id?: string;
  check_in: Date;
  check_out?: Date;
  check_in_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  check_out_location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  check_in_confidence?: number;
  check_out_confidence?: number;
  type: "face-scan" | "manual" | "admin";
  manual_name?: string;
  synced_to_hr?: boolean;
  hr_sync_id?: string;
  last_hr_sync?: Date;
  created_at?: Date;
  updated_at?: Date;
}
