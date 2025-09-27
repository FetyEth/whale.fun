import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/lib/models/User';
import { FallbackStorage } from '@/lib/fallback-storage';

// PATCH /api/users/onboard - Mark user as onboarded
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let user;
    let usingFallback = false;

    try {
      await connectToDatabase();
      user = await User.findOneAndUpdate(
        { walletAddress: walletAddress.toLowerCase() },
        { isOnboarded: true },
        { new: true }
      );
    } catch (dbError) {
      console.warn('MongoDB unavailable, using fallback storage:', dbError);
      usingFallback = true;
      user = FallbackStorage.markOnboarded(walletAddress);
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { 
        message: 'User onboarding completed',
        usingFallback,
        user: {
          walletAddress: user.walletAddress,
          isOnboarded: user.isOnboarded,
          profile: user.profile,
          preferences: user.preferences,
          updatedAt: user.updatedAt || user.createdAt,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating user onboarding status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
