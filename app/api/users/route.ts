import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import User from '@/lib/models/User';
import { FallbackStorage } from '@/lib/fallback-storage';

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

    let user;
    let usingFallback = false;

    try {
      await connectToDatabase();
      user = await User.findOne({ 
        walletAddress: walletAddress.toLowerCase() 
      });
    } catch (dbError) {
      console.warn('MongoDB unavailable, using fallback storage:', dbError);
      usingFallback = true;
      user = FallbackStorage.findUser(walletAddress);
    }

    if (!user) {
      return NextResponse.json(
        { exists: false, user: null, usingFallback },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { 
        exists: true, 
        usingFallback,
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
    
    // This shouldn't happen now since we have fallback handling
    console.error('Unexpected error in user lookup:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create new user
export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      const text = await request.text();
      if (!text || text.trim() === '') {
        return NextResponse.json(
          { error: 'Request body is empty' },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { walletAddress, profile } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    let existingUser;
    let newUser;
    let usingFallback = false;

    try {
      await connectToDatabase();
      
      // Check if user already exists
      existingUser = await User.findOne({ 
        walletAddress: walletAddress.toLowerCase() 
      });

      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'User already exists',
            usingFallback: false,
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

      // Create new user in MongoDB
      const mongoUser = new User({
        walletAddress: walletAddress.toLowerCase(),
        isOnboarded: false,
        profile: profile || {},
      });

      await mongoUser.save();
      newUser = mongoUser;
      
    } catch (dbError) {
      console.warn('MongoDB unavailable, using fallback storage:', dbError);
      usingFallback = true;
      
      // Check if user exists in fallback
      existingUser = FallbackStorage.findUser(walletAddress);
      
      if (existingUser) {
        return NextResponse.json(
          { 
            error: 'User already exists',
            usingFallback: true,
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
      
      // Create new user in fallback storage
      newUser = FallbackStorage.createUser(walletAddress, profile);
    }

    return NextResponse.json(
      { 
        message: 'User created successfully',
        usingFallback,
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
    
    // This shouldn't happen now since we have fallback handling
    console.error('Unexpected error in user creation:', error);
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
