import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Role, UserRole } from '@/lib/permissions';

interface AuthState {
  isAuthenticated: boolean;
  role: Role | null;
  email: string | null;
  phone: string | null;
  userId: string | null;
  accessToken: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  role: null,
  email: null,
  phone: null,
  userId: null,
  accessToken: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ role: Role; email: string; phone?: string; userId: string; accessToken: string }>) => {
      state.isAuthenticated = true;
      state.role = action.payload.role;
      state.email = action.payload.email;
      state.phone = action.payload.phone || null;
      state.userId = action.payload.userId;
      state.accessToken = action.payload.accessToken;
      // Persist to localStorage
      localStorage.setItem('userRole', action.payload.role);
      localStorage.setItem('userEmail', action.payload.email);
      if (action.payload.phone) {
        localStorage.setItem('userPhone', action.payload.phone);
      }
      localStorage.setItem('userId', action.payload.userId);
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('loginTimestamp', Date.now().toString());
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.role = null;
      state.email = null;
      state.phone = null;
      state.userId = null;
      state.accessToken = null;
      localStorage.removeItem('userRole');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userId');
      localStorage.removeItem('accessToken');
    },
    initializeAuth: (state) => {
      const role = localStorage.getItem('userRole') as Role | null;
      const email = localStorage.getItem('userEmail');
      const phone = localStorage.getItem('userPhone');
      const userId = localStorage.getItem('userId');
      const accessToken = localStorage.getItem('accessToken');
      if (role && email && userId && accessToken) {
        state.isAuthenticated = true;
        state.role = role;
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

