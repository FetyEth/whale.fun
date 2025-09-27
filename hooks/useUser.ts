import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';

interface UserProfile {
  displayName?: string;
  avatar?: string;
}

interface UserPreferences {
  theme?: 'light' | 'dark';
  notifications?: boolean;
}

interface User {
  walletAddress: string;
  isOnboarded: boolean;
  profile?: UserProfile;
  preferences?: UserPreferences;
  createdAt: string;
}

interface UseUserReturn {
  user: User | null;
  isLoading: boolean;
  isNewUser: boolean;
  showOnboarding: boolean;
  checkUser: () => Promise<void>;
  createUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  dismissOnboarding: () => void;
}

export function useUser(): UseUserReturn {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  const createNewUser = useCallback(async () => {
    if (!address) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.usingFallback) {
        console.info('Using fallback storage for user creation');
      }

      if (response.ok) {
        setUser(data.user);
        setIsNewUser(true);
        setShowOnboarding(true);
      } else if (response.status === 409) {
        // User already exists
        setUser(data.user);
        setIsNewUser(false);
        setShowOnboarding(!data.user.isOnboarded);
      }
    } catch (error) {
      console.error('Error creating user:', error);
      // Don't show onboarding if there's a connection error
      setShowOnboarding(false);
    }
  }, [address]);

  const checkUser = useCallback(async () => {
    if (!address || !isConnected) {
      setUser(null);
      setIsNewUser(false);
      setShowOnboarding(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/users?walletAddress=${address}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.usingFallback) {
        console.info('Using fallback storage for user data');
      }

      if (data.exists) {
        setUser(data.user);
        setIsNewUser(false);
        // Show onboarding if user exists but hasn't completed onboarding
        setShowOnboarding(!data.user.isOnboarded);
      } else {
        setUser(null);
        setIsNewUser(true);
        // Auto-create user and show onboarding for new users
        await createNewUser();
      }
    } catch (error) {
      console.error('Error checking user:', error);
      // Don't show onboarding if there's a connection error
      setShowOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, createNewUser]);

  const createUser = useCallback(async () => {
    await createNewUser();
  }, [createNewUser]);

  const completeOnboarding = useCallback(async () => {
    if (!address || !user) return;

    try {
      const response = await fetch('/api/users/onboard', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: address,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  }, [address, user]);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  return {
    user,
    isLoading,
    isNewUser,
    showOnboarding,
    checkUser,
    createUser,
    completeOnboarding,
    dismissOnboarding,
  };
}
