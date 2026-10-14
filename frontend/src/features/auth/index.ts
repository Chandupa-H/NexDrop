export interface UserProfile {
  id: number;
  email: string;
  full_name: string;
  role: "admin" | "customer" | "merchant" | "courier" | "dispatcher";
  is_active: boolean;
}

export interface AuthState {
  user: UserProfile | null;
  isAuthenticated: boolean;
  token: string | null;
}
