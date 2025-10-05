import { useEffect, useState } from 'react';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks/useDataPersist';
import type { User } from '@/types';

/**
 * AppInitializer loads persisted user data on app start
 * and sets the global state accordingly
 */
export function useAppInitializer() {
  const { dispatch, setUser, setLoggedIn } = useAppSlice();
  const { getPersistData } = useDataPersist();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadPersistedUser() {
      try {
        const user = await getPersistData<User>(DataPersistKeys.USER);

        // User is logged in if they have a wallet address
        if (user?.walletAddress) {
          dispatch(setUser(user));
          dispatch(setLoggedIn(true));
          console.log('✅ User loaded from storage:', user.walletAddress);
        } else {
          dispatch(setLoggedIn(false));
          console.log('ℹ️  No user found in storage');
        }
      } catch (error) {
        console.error('❌ Failed to load persisted user:', error);
        dispatch(setLoggedIn(false));
      } finally {
        setIsLoading(false);
      }
    }

    loadPersistedUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  return { isLoading };
}
