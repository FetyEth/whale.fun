"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeBannerProps {
  userName?: string;
  onStartTutorial: () => void;
  onDismiss: () => void;
}

export function WelcomeBanner({ userName, onStartTutorial, onDismiss }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <Card className="mx-4 mt-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h3 className="text-lg font-semibold text-gray-900">
                  Welcome to Whale.fun! 🐋
                </h3>
                <Badge variant="secondary" className="text-xs">
                  New User
                </Badge>
              </div>
              
              <p className="text-gray-600 mb-4">
                {userName ? `Hey ${userName}! ` : 'Hey there! '}
                You&apos;re now part of the most exciting meme token ecosystem. 
                Ready to dive in and start your journey to becoming a crypto whale?
              </p>
              
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={onStartTutorial}
                  className="flex items-center space-x-2"
                >
                  <span>Take the Tour</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={handleDismiss}
                  className="text-gray-600"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
