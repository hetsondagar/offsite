import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Role, UserRole } from '@/lib/permissions';

const AUTH_STORAGE_KEY = 'offsiteAuth';

interface AuthState {
  isInitialized: boolean;
  isAuthenticated: boolean;
  role: Role | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
  accessToken: string | null;
}

const initialState: AuthState = {
  isInitialized: false,
  isAuthenticated: false,
  role: null,
  name: null,
  email: null,
  phone: null,
  userId: null,
  accessToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ role: Role; name?: string; email: string; phone?: string; userId: string; accessToken: string }>) => {
      state.isInitialized = true;
      state.isAuthenticated = true;
      state.role = action.payload.role;
      state.name = action.payload.name || null;
      state.email = action.payload.email;
      state.phone = action.payload.phone || null;
      state.userId = action.payload.userId;
      state.accessToken = action.payload.accessToken;
      // Persist to localStorage
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          role: action.payload.role,
          name: action.payload.name || null,
          email: action.payload.email,
          phone: action.payload.phone || null,
          userId: action.payload.userId,
          accessToken: action.payload.accessToken,
        })
      );
      localStorage.setItem('userRole', action.payload.role);
      localStorage.setItem('userEmail', action.payload.email);
      if (action.payload.name) {
        localStorage.setItem('userName', action.payload.name);
      }
      if (action.payload.phone) {
        localStorage.setItem('userPhone', action.payload.phone);
      }
      localStorage.setItem('userId', action.payload.userId);
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('loginTimestamp', Date.now().toString());
    },
    logout: (state) => {
      state.isInitialized = true;
      state.isAuthenticated = false;
      state.role = null;
      state.name = null;
      state.email = null;
      state.phone = null;
      state.userId = null;
      state.accessToken = null;
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userId');
      localStorage.removeItem('accessToken');
    },
    initializeAuth: (state) => {
      state.isInitialized = true;

      // Prefer the consolidated auth blob (more resilient across app changes)
      const storedAuthRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuthRaw) {
        try {
          const parsed = JSON.parse(storedAuthRaw) as Partial<{
            role: Role;
            name: string | null;
            email: string;
            phone: string | null;
            userId: string;
            accessToken: string;
          }>;

          if (parsed.role && parsed.email && parsed.userId && parsed.accessToken) {
            state.isAuthenticated = true;
            state.role = parsed.role;
            state.name = parsed.name ?? null;
            state.email = parsed.email;
            state.phone = parsed.phone ?? null;
            state.userId = parsed.userId;
            state.accessToken = parsed.accessToken;
            return;
          }
        } catch {
          // Ignore and fall back to legacy keys
        }
      }

      // Legacy per-key hydration
      const role = localStorage.getItem('userRole') as Role | null;
      const name = localStorage.getItem('userName');
      const email = localStorage.getItem('userEmail');
      const phone = localStorage.getItem('userPhone');
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('accessToken');

      if (role && email && userId && accessToken) {
        state.isAuthenticated = true;
        state.role = role;
        state.name = name;
        state.email = email;
        state.phone = phone;
        state.userId = userId;
        state.accessToken = accessToken;
      }
    },
  },
});

export const { login, logout, initializeAuth } = authSlice.actions;
export default authSlice.reducer;

