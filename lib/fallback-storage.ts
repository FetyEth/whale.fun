// Simple in-memory storage fallback when MongoDB is not available
interface FallbackUser {
  walletAddress: string;
  isOnboarded: boolean;
  createdAt: string;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}

// In-memory storage (will reset on server restart)
const fallbackUsers = new Map<string, FallbackUser>();

export class FallbackStorage {
  static findUser(walletAddress: string): FallbackUser | null {
    return fallbackUsers.get(walletAddress.toLowerCase()) || null;
  }

  static createUser(walletAddress: string, profile?: any): FallbackUser {
    const user: FallbackUser = {
      walletAddress: walletAddress.toLowerCase(),
      isOnboarded: false,
      createdAt: new Date().toISOString(),
      profile: profile || {},
      preferences: {
        theme: 'light',
        notifications: true,
      },
    };

    fallbackUsers.set(walletAddress.toLowerCase(), user);
    return user;
  }

  static updateUser(walletAddress: string, updates: Partial<FallbackUser>): FallbackUser | null {
    const existingUser = fallbackUsers.get(walletAddress.toLowerCase());
    if (!existingUser) {
      return null;
    }

    const updatedUser = { ...existingUser, ...updates };
    fallbackUsers.set(walletAddress.toLowerCase(), updatedUser);
    return updatedUser;
  }

  static markOnboarded(walletAddress: string): FallbackUser | null {
    return this.updateUser(walletAddress, { isOnboarded: true });
  }

  static getAllUsers(): FallbackUser[] {
    return Array.from(fallbackUsers.values());
  }

  static clearAll(): void {
    fallbackUsers.clear();
  }
}
