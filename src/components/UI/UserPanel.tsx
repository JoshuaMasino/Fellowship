import React, { useState, useEffect } from 'react';
import { User, MapPin, Settings, X } from 'lucide-react';
import { Pin, supabase } from '../../lib/supabase';

interface UserPanelProps {
  username: string;
  onUsernameChange: (newUsername: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const UserPanel: React.FC<UserPanelProps> = ({
  username,
  onUsernameChange,
  isOpen,
  onClose,
}) => {
  const [userPins, setUserPins] = useState<Pin[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserPins();
    }
  }, [isOpen, username]);

  const fetchUserPins = async () => {
    const { data } = await supabase
      .from('pins')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false });
    
    if (data) setUserPins(data);
  };

  const handleUsernameSubmit = () => {
    if (newUsername.trim() && newUsername.length === 7 && /^\d+$/.test(newUsername)) {
      onUsernameChange(newUsername);
      setIsEditingUsername(false);
      setNewUsername('');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 glass-white rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600 icon-shadow-white-md" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">Your Profile</h2>
                <p className="text-blue-100 text-shadow-white-sm">
                  Guest {username}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-5 h-5 icon-shadow-white-sm" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Username Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-200">Username</h3>
              <button
                onClick={() => setIsEditingUsername(!isEditingUsername)}
                className="text-orange-500 hover:text-orange-600 transition-colors"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            
            {isEditingUsername ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter 7-digit username"
                  maxLength={7}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
                />
                <div className="flex space-x-2">
                  <button
                    onClick={handleUsernameSubmit}
                    disabled={!newUsername.trim() || newUsername.length !== 7 || !/^\d+$/.test(newUsername)}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Update
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingUsername(false);
                      setNewUsername('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-400">
                  Username must be exactly 7 digits
                </p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-200 font-mono text-lg">Guest {username}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Tap the settings icon to change your username
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-yellow-50/10 to-orange-50/10 bg-gray-800 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                <h3 className="text-lg font-semibold text-gray-200">Your Pins</h3>
              </div>
              <p className="text-2xl font-bold text-orange-400">{userPins.length}</p>
              <p className="text-sm text-gray-400">pins created</p>
            </div>
          </div>

          {/* Recent Pins */}
          <div>
            <h3 className="text-lg font-semibold text-gray-200 mb-3">Recent Pins</h3>
            {userPins.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No pins created yet</p>
                <p className="text-sm">Tap on the map to create your first pin!</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {userPins.map((pin) => (
                  <div
                    key={pin.id}
                    className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start space-x-3">
                      {pin.images && pin.images.length > 0 && (
                        <img
                          src={pin.images[0]}
                          alt="Pin preview"
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-200 truncate">
                          {pin.description}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(pin.created_at)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPanel;