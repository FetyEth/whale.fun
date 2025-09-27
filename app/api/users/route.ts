import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/lib/models/User';

// GET /api/users - Check if user exists and get user data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('walletAddress');

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const user = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (!user) {
      return NextResponse.json(
        { exists: false, user: null },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        exists: true, 
        user: {
          walletAddress: user.walletAddress,
          isOnboarded: user.isOnboarded,
          profile: user.profile,
          preferences: user.preferences,
          createdAt: user.createdAt,
        }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error checking user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, profile } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ 
      walletAddress: walletAddress.toLowerCase() 
    });

    if (existingUser) {
      return NextResponse.json(
        { 
          error: 'User already exists',
          user: {
            walletAddress: existingUser.walletAddress,
            isOnboarded: existingUser.isOnboarded,
            profile: existingUser.profile,
            preferences: existingUser.preferences,
            createdAt: existingUser.createdAt,
          }
        },
        { status: 409 }
      );
    }

    // Create new user
    const newUser = new User({
      walletAddress: walletAddress.toLowerCase(),
      isOnboarded: false,
      profile: profile || {},
    });

    await newUser.save();

    return NextResponse.json(
      { 
        message: 'User created successfully',
        user: {
          walletAddress: newUser.walletAddress,
          isOnboarded: newUser.isOnboarded,
          profile: newUser.profile,
          preferences: newUser.preferences,
          createdAt: newUser.createdAt,
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
