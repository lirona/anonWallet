import { Dispatch, State } from '@/utils/store';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import type { TokenTransfer } from '@/services/token';
import type { Hex } from 'viem';

export interface TokenState {
  balance: string; // Formatted balance (e.g., "101.0")
  balanceRaw: Hex; // Raw balance in wei as hex string
  transactions: TokenTransfer[];
  lastFetchedBlock: Hex | null; // Track the last block we fetched transactions from
  isLoadingBalance: boolean;
  isLoadingTransactions: boolean;
  isLoadingMore: boolean; // For infinite scroll
  error: string | null;
}

const initialState: TokenState = {
  balance: '0',
  balanceRaw: '0x0',
  transactions: [],
  lastFetchedBlock: null,
  isLoadingBalance: false,
  isLoadingTransactions: false,
  isLoadingMore: false,
  error: null,
};

const slice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    setBalance: (state: TokenState, { payload }: PayloadAction<{ balance: string; balanceRaw: Hex }>) => {
      state.balance = payload.balance;
      state.balanceRaw = payload.balanceRaw;
    },
    setTransactions: (state: TokenState, { payload }: PayloadAction<TokenTransfer[]>) => {
      state.transactions = payload;
      // Update last fetched block from the most recent transaction
      if (payload.length > 0) {
        state.lastFetchedBlock = payload[0].blockNumber;
      }
    },
    appendTransactions: (state: TokenState, { payload }: PayloadAction<TokenTransfer[]>) => {
      // Append more transactions (for infinite scroll)
      state.transactions = [...state.transactions, ...payload];
    },
    prependTransactions: (state: TokenState, { payload }: PayloadAction<TokenTransfer[]>) => {
      // Prepend new transactions (from polling)
      const existingHashes = new Set(state.transactions.map(tx => tx.transactionHash));
      const newTransactions = payload.filter(tx => !existingHashes.has(tx.transactionHash));
      state.transactions = [...newTransactions, ...state.transactions];
      // Update last fetched block
      if (newTransactions.length > 0) {
        state.lastFetchedBlock = newTransactions[0].blockNumber;
      }
    },
    setLastFetchedBlock: (state: TokenState, { payload }: PayloadAction<Hex>) => {
      state.lastFetchedBlock = payload;
    },
    setLoadingBalance: (state: TokenState, { payload }: PayloadAction<boolean>) => {
      state.isLoadingBalance = payload;
    },
    setLoadingTransactions: (state: TokenState, { payload }: PayloadAction<boolean>) => {
      state.isLoadingTransactions = payload;
    },
    setLoadingMore: (state: TokenState, { payload }: PayloadAction<boolean>) => {
      state.isLoadingMore = payload;
    },
    setError: (state: TokenState, { payload }: PayloadAction<string | null>) => {
      state.error = payload;
    },
    reset: () => initialState,
  },
});

export function useTokenSlice() {
  const dispatch = useDispatch<Dispatch>();
  const state = useSelector(({ token }: State) => token);
  return { dispatch, ...state, ...slice.actions };
}

export default slice.reducer;
