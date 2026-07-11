export interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
  api_key?: string;
  is_admin: number;
  is_blocked: number;
  last_seen?: number;
}

export interface Service {
  id: number;
  name: string;
  category: string;
  price_per_k: number;
  min_qty: number;
  max_qty: number;
}

export interface Order {
  id: number;
  user_id: number;
  service_id: number;
  link: string;
  voting_option: string;
  quantity: number;
  charge: number;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Cancelled';
  created_at: number;
  service_name?: string;
  service_category?: string;
  user_name?: string;
  user_email?: string;
}

export interface Payment {
  id: number;
  user_id: number;
  amount: number;
  trx_id: string;
  screenshot?: string; // Base64 data URL
  status: 'Pending' | 'Approved' | 'Rejected';
  created_at: number;
  user_name?: string;
  user_email?: string;
}

export interface SystemSettings {
  jazzcash_number: string;
  jazzcash_name: string;
  system_api_key?: string;
}
