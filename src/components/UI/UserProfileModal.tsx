import React, { useState, useEffect } from 'react';
import { User, MapPin, X } from 'lucide-react';
import { Pin, getUserPins } from '../../lib/supabase';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  currentUser: string;
  onSelectPin: (pinId: string) => void;
  isCurrentUserAdmin?: boolean;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  username,
  currentUser,
  onSelectPin,
  isCurrentUserAdmin = false,
}) => {
  const [userPins, setUserPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(false);

  const isOwnProfile = username === currentUser;
  const isGuestUser = username.match(/^\d{7}$/);

  useEffect(() => {
    if (isOpen && username) {
      fetchProfileData();
    }
  }, [isOpen, username]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const pins = await getUserPins(username);
      setUserPins(pins);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {loading && (
          <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Banner Section */}
        <div className="relative h-32 glass-header overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <User className="w-8 h-8 mx-auto mb-2 opacity-70 icon-shadow-white-sm" />
              <p className="text-sm opacity-70 text-shadow-white-sm">Guest Profile</p>
            </div>
          </div>
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 glass-white hover:bg-white/20 rounded-full text-white transition-colors"
          >
            <X className="w-5 h-5 icon-shadow-white-sm" />
          </button>
        </div>

        {/* Profile Header */}
        <div className="relative px-6 pb-6">
          {/* Profile Picture */}
          <div className="absolute -top-16 left-6">
            <div className="w-24 h-24 bg-gray-800 rounded-full p-1 shadow-lg">
              <div className="w-full h-full rounded-full glass-header flex items-center justify-center">
                <User className="w-8 h-8 text-white icon-shadow-white-md" />
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="pt-12">
            <div className="flex items-center space-x-2 mb-2">
              <h1 className="text-2xl font-bold text-gray-200">
                Guest {username}
              </h1>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Guest user
            </p>

            {/* Authentication Button for Current User */}
            {isOwnProfile && (
              <div className="mb-4">
                <button
                  onClick={() => {
                    onClose();
                    // This will be handled by the parent component
                    window.dispatchEvent(new CustomEvent('openAuth'));
                  }}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center justify-center space-x-2"
                >
                  <User className="w-5 h-5" />
                  <span>Sign Up / Sign In</span>
                </button>
                <p className="text-xs text-gray-400 text-center mt-2">
                  Create an account to save your pins and access more features
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex space-x-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{userPins.length}</div>
                <div className="text-sm text-gray-400">Pins</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 overflow-y-auto max-h-[50vh]">
          {/* Pins Section */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-200">Pins</h3>
            </div>
            
            {userPins.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pins created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 max-h-64 overflow-y-auto">
                {userPins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => onSelectPin(pin.id)}
                    className="bg-gray-800 hover:bg-gray-700 rounded-lg p-4 text-left transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      {pin.images && pin.images.length > 0 && (
                        <img
                          src={pin.images[0]}
                          alt="Pin preview"
                          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 line-clamp-2 mb-1">
                          {pin.description}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(pin.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;