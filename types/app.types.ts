import { Role } from '@/constants/roles';

export interface UserProfile {
  id: string;
  role: Role;
  branch_id?: string | null;
  full_name: string;
}

export interface Branch {
  id: string;
  name: string;
  location: string;
  created_at: string;
}

export interface Coach {
  id: string;
  user_id: string;
  branch_id: string;
  full_name: string;
  phone: string;
}

export interface Player {
  id: string;
  branch_id: string;
  full_name: string;
  date_of_birth: string;
  parent_name: string;
  parent_phone: string;
  enrolled_date: string;
  status: 'active' | 'inactive';
}

export interface Attendance {
  id: string;
  player_id: string;
  branch_id: string;
  date: string;
  status: 'present' | 'absent';
}

export interface Fee {
  id: string;
  player_id: string;
  branch_id: string;
  month: string; // YYYY-MM
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paid_date?: string | null;
}
