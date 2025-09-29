import { User } from '@/types';
import { Dispatch, State } from '@/utils/store';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';

export interface AppState {
  checked: boolean;
  loggedIn: boolean;
  user?: User;
}

const initialState: AppState = {
  checked: false,
  loggedIn: false,
  user: undefined,
};

const slice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setLoggedIn: (state: AppState, { payload }: PayloadAction<boolean>) => {
      state.checked = true;
      state.loggedIn = payload;
    },
    setUser: (state: AppState, { payload }: PayloadAction<User | undefined>) => {
      state.user = payload;
    },
    reset: () => initialState,
  },
});

export function useAppSlice() {
  const dispatch = useDispatch<Dispatch>();
  const state = useSelector(({ app }: State) => app);
  return { dispatch, ...state, ...slice.actions };
}

export default slice.reducer;