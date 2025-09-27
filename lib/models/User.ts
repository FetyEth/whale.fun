import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  walletAddress: string;
  isOnboarded: boolean;
  createdAt: Date;
  updatedAt: Date;
  profile?: {
    displayName?: string;
    avatar?: string;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
  };
}

const UserSchema: Schema = new Schema({
  walletAddress: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    index: true,
  },
  isOnboarded: {
    type: Boolean,
    default: false,
  },
  profile: {
    displayName: {
      type: String,
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light',
    },
    notifications: {
      type: Boolean,
      default: true,
    },
  },
}, {
  timestamps: true,
});

// Prevent re-compilation during development
export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
