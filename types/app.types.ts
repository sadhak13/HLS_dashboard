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
  batch_id: string | null;
  date: string;
  status: 'present' | 'absent';
  absence_reason_category: string | null;
  absence_reason_note: string | null;
  created_at: string;
}

export interface Fee {
  id: string;
  player_id: string;
  branch_id: string;
  month: string; // YYYY-MM
  amount: number;
  status: 'paid' | 'pending';
  paid_date?: string | null;
}

export interface BranchFinanceRevision {
  id: string;
  branch_id: string;
  rent_type: 'fixed' | 'percentage';
  rent_value: number;
  standard_fee_per_student: number;
  effective_from: string; // YYYY-MM
  created_at: string;
}

export interface CoachSalaryHistoryEntry {
  id: string;
  coach_id: string;
  monthly_salary: number;
  effective_from: string; // YYYY-MM
  created_at: string;
}

export interface Expense {
  id: string;
  branch_id: string | null; // null = whole-academy overhead, not tied to one branch
  category: 'equipment' | 'transport' | 'utilities' | 'maintenance' | 'medical' | 'food' | 'printing' | 'licensing' | 'misc';
  amount: number;
  month: string; // YYYY-MM
  description: string;
  created_at: string;
}

export interface ForecastAssumptions {
  id: string;
  branch_id: string;
  monthly_revenue_growth_pct: number;
  annual_rent_growth_pct: number;
  annual_salary_growth_pct: number;
  updated_at: string;
}
