export interface AttendanceRecord {
  id: string;
  type: 'check-in' | 'check-out';
  timestamp: number;
  date: string;
  time: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  faceDescriptor?: number[];
  synced: boolean;
  photoDataUrl?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  employeeId: string;
  department?: string;
  faceDescriptor: number[];
  createdAt: number;
  photoDataUrl?: string;
}

export interface FaceDetectionResult {
  detected: boolean;
  confidence: number;
  descriptor: number[] | null;
}