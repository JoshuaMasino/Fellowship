import React from 'react';
import { User, MapPin, Zap, MessageSquare } from 'lucide-react';

interface FloatingControlsProps {
  onOpenUserProfile: () => void;
  onOpenExploreModal: () => void;
  onOpenChatWindow: () => void;
  totalPins: number;
  currentUser: string;
}

const FloatingControls: React.FC<FloatingControlsProps> = ({
  onOpenUserProfile,
  onOpenExploreModal,
  onOpenChatWindow,
  totalPins,
  currentUser,
}) => {
  return (
    <div className="fixed bottom-4 left-4 z-40 space-y-3 pointer-events-none">
      {/* User Profile Button */}
      <button
        onClick={onOpenUserProfile}
        className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
        title="View your profile & settings"
      >
        <User className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
      </button>

      {/* Chat Button */}
      <button
        onClick={onOpenChatWindow}
        className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
        title="Open chat"
      >
        <MessageSquare className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
      </button>

      {/* Stats Panel - Now Clickable for Explore */}
      <button
        onClick={onOpenExploreModal}
        className="w-14 h-14 glass-blue rounded-full shadow-xl flex flex-col items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200 pointer-events-auto"
        title="Explore all pins"
      >
        <Zap className="w-4 h-4 text-yellow-500 mb-1 icon-shadow-white-sm" />
        <div className="text-xs font-bold text-blue-800 text-shadow-white-sm">{totalPins}</div>
      </button>

      {/* Help Text */}
      <div className="glass-blue rounded-2xl shadow-xl p-3 text-center max-w-[200px] pointer-events-auto">
        <div className="flex items-center justify-center space-x-1 mb-1">
          <MapPin className="w-4 h-4 text-blue-800 icon-shadow-white-sm" />
        </div>
        <div className="text-xs font-medium text-blue-800 text-shadow-white-sm">
          Tap anywhere on the map to create a pin!
        </div>
      </div>
    </div>
  );
};

export default FloatingControls;