import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface PendingItem {
  id: string;
  type: 'dpr' | 'attendance' | 'material' | 'approval';
  data: any;
  timestamp: number;
  synced: boolean;
}

interface OfflineState {
  isOnline: boolean;
  pendingItems: PendingItem[];
  lastSyncTime: number | null;
  isSyncing: boolean;
}

const initialState: OfflineState = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  pendingItems: [],
  lastSyncTime: null,
  isSyncing: false,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
    },
    addPendingItem: (state, action: PayloadAction<Omit<PendingItem, 'id' | 'timestamp' | 'synced'>>) => {
      const newItem: PendingItem = {
        id: `pending_${Date.now()}_${Math.random()}`,
        ...action.payload,
        timestamp: Date.now(),
        synced: false,
      };
      state.pendingItems.push(newItem);
    },
    markItemSynced: (state, action: PayloadAction<string>) => {
      const item = state.pendingItems.find(item => item.id === action.payload);
      if (item) {
        item.synced = true;
      }
    },
    removePendingItem: (state, action: PayloadAction<string>) => {
      state.pendingItems = state.pendingItems.filter(item => item.id !== action.payload);
    },
    setSyncing: (state, action: PayloadAction<boolean>) => {
      state.isSyncing = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload;
    },
    clearSyncedItems: (state) => {
      state.pendingItems = state.pendingItems.filter(item => !item.synced);
    },
  },
});

export const {
  setOnlineStatus,
  addPendingItem,
  markItemSynced,
  removePendingItem,
  setSyncing,
  setLastSyncTime,
  clearSyncedItems,
} = offlineSlice.actions;
export default offlineSlice.reducer;

