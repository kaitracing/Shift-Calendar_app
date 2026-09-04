export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'manager' | 'member';

export type Department =
  | 'mechanical'
  | 'electrical'
  | 'aerodynamics_cooling'
  | 'management'
  | 'other';

export type ShiftStatus = 'submitted' | 'confirmed' | 'rejected' | 'canceled';

export type CheckinStatus = 'working' | 'completed' | 'auto_closed';

export type EventCategory = 'driving' | 'judging' | 'meeting' | 'general';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string;
          student_id: string | null;
          department: Department;
          sub_departments: Department[];
          role: UserRole;
          is_banned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name: string;
          student_id?: string | null;
          department?: Department;
          sub_departments?: Department[];
          role?: UserRole;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string;
          student_id?: string | null;
          department?: Department;
          sub_departments?: Department[];
          role?: UserRole;
          is_banned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          name: string;
          latitude: number;
          longitude: number;
          radius_meters: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          latitude: number;
          longitude: number;
          radius_meters?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          latitude?: number;
          longitude?: number;
          radius_meters?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      shifts: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status: ShiftStatus;
          assigned_task: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          start_time: string;
          end_time: string;
          status?: ShiftStatus;
          assigned_task?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          start_time?: string;
          end_time?: string;
          status?: ShiftStatus;
          assigned_task?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      checkins: {
        Row: {
          id: string;
          user_id: string;
          location_id: string | null;
          checkin_at: string;
          checkout_at: string | null;
          latitude: number;
          longitude: number;
          distance_meters: number;
          status: CheckinStatus;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          location_id?: string | null;
          checkin_at?: string;
          checkout_at?: string | null;
          latitude: number;
          longitude: number;
          distance_meters: number;
          status?: CheckinStatus;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          location_id?: string | null;
          checkin_at?: string;
          checkout_at?: string | null;
          latitude?: number;
          longitude?: number;
          distance_meters?: number;
          status?: CheckinStatus;
          notes?: string | null;
          created_at?: string;
        };
      };
      events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          start_date: string;
          end_date: string;
          category: EventCategory;
          color: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          start_date: string;
          end_date: string;
          category: EventCategory;
          color?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          start_date?: string;
          end_date?: string;
          category?: EventCategory;
          color?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export const DEPARTMENT_LABELS: Record<Department, string> = {
  mechanical: '機械班',
  electrical: '電気班',
  aerodynamics_cooling: '空力・冷却班',
  management: '事務班',
  other: 'その他',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: '最高管理者 (Admin)',
  manager: 'リーダー/幹部 (Manager)',
  member: '一般部員 (Member)',
};
