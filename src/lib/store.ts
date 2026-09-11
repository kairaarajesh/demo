import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permission: Record<string, string[]>;
    branchId?: string | { id: string; name: string }; // ✅ Add this line

}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('salon_token', token);
      localStorage.setItem('salon_user', JSON.stringify(user));
    }
    set({ 
      token, 
      user, 
      isAuthenticated: true 
    });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('salon_token');
      localStorage.removeItem('salon_user');
    }
    set({ 
      token: null, 
      user: null, 
      isAuthenticated: false 
    });
  },

  hydrate: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('salon_token');
      const userStr = localStorage.getItem('salon_user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ 
            token, 
            user, 
            isAuthenticated: true 
          });
        } catch {
          localStorage.removeItem('salon_token');
          localStorage.removeItem('salon_user');
        }
      }
    }
  },
}));

// Active page/module navigation
type ModulePage = 'dashboard' | 'staff-list' | 'attendance' | 'clients' | 'appointments' | 'services' | 'transactions' | 'branches' | 'products' | 'reports';

interface NavState {
  activePage: ModulePage;
  setActivePage: (page: ModulePage) => void;
}

export const useNavStore = create<NavState>((set) => ({
  activePage: 'dashboard',
  setActivePage: (page) => set({ activePage: page }),
}));