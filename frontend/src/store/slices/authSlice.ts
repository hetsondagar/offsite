import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Role, UserRole } from '@/lib/permissions';

interface AuthState {
  isAuthenticated: boolean;
  role: Role | null;
  phone: string | null;
  userId: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  role: null,
  phone: null,
  userId: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    login: (state, action: PayloadAction<{ role: Role; phone: string; userId: string }>) => {
      state.isAuthenticated = true;
      state.role = action.payload.role;
      state.phone = action.payload.phone;
      state.userId = action.payload.userId;
      // Persist to localStorage
      localStorage.setItem('userRole', action.payload.role);
      localStorage.setItem('userPhone', action.payload.phone);
      localStorage.setItem('userId', action.payload.userId);
      localStorage.setItem('loginTimestamp', Date.now().toString());
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.role = null;
      state.phone = null;
      state.userId = null;
      localStorage.removeItem('userRole');
      localStorage.removeItem('userPhone');
      localStorage.removeItem('userId');
    },
    initializeAuth: (state) => {
      const role = localStorage.getItem('userRole') as Role | null;
      const phone = localStorage.getItem('userPhone');
      const userId = localStorage.getItem('userId');
      if (role && phone && userId) {
        state.isAuthenticated = true;
        state.role = role;
        state.phone = phone;
        state.userId = userId;
      }
    },
  },
});

export const { login, logout, initializeAuth } = authSlice.actions;
export default authSlice.reducer;

