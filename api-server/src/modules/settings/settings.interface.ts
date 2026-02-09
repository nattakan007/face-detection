export interface Settings {
  id: string;
  company_id: string;
  scan_duration_ms: number;
  face_confidence_threshold: number;
  auto_capture_cooldown_ms: number;
  work_schedule: {
    check_in_start: string;
    check_in_end: string;
    check_out_start: string;
    check_out_end: string;
  };
  shifts: Array<{
    name: string;
    start: string;
    end: string;
  }>;
  auto_checkout_enabled: boolean;
  auto_checkout_hours: number;
  duplicate_check_window_minutes: number;
  created_at?: Date;
  updated_at?: Date;
}
