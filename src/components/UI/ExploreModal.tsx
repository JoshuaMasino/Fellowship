import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Heart, MessageCircle, Search, Filter } from 'lucide-react';
import { Pin, supabase } from '../../lib/supabase';

interface ExploreModalProps {
  isOpen: boolean;
  onClose: () => void;
  pins: Pin[];
  onSelectPin: (pinId: string) => void;
  onOpenUserProfile: (username: string) => void;
  currentUser: string;
}

const ExploreModal: React.FC<ExploreModalProps> = ({
  isOpen,
  onClose,
  pins,
  onSelectPin,
  onOpenUserProfile,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('newest');
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    if (isOpen) {
      fetchEngagementData();
    }
  }, [isOpen, pins]);

  const fetchEngagementData = async () => {
    if (pins.length === 0) return;

    const pinIds = pins.map(pin => pin.id);

    // Fetch like counts
    const { data: likes } = await supabase
      .from('likes')
      .select('pin_id')
      .in('pin_id', pinIds);

    // Fetch comment counts
    const { data: comments } = await supabase
      .from('comments')
      .select('pin_id')
      .in('pin_id', pinIds);

    // Count likes per pin
    const likeCountMap: { [key: string]: number } = {};
    likes?.forEach(like => {
      likeCountMap[like.pin_id] = (likeCountMap[like.pin_id] || 0) + 1;
    });

    // Count comments per pin
    const commentCountMap: { [key: string]: number } = {};
    comments?.forEach(comment => {
      commentCountMap[comment.pin_id] = (commentCountMap[comment.pin_id] || 0) + 1;
    });

    setLikeCounts(likeCountMap);
    setCommentCounts(commentCountMap);
  };

  const filteredAndSortedPins = pins
    .filter(pin => 
      pin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pin.username.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      } else if (sortBy === 'most-liked') {
        const aLikes = likeCounts[a.id] || 0;
        const bLikes = likeCounts[b.id] || 0;
        // Sort by likes descending, then by newest if likes are equal
        if (bLikes === aLikes) {
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return bLikes - aLikes;
      }
      return 0;
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handlePinClick = (pinId: string) => {
    onSelectPin(pinId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="glass-header p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 glass-white rounded-full flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 icon-shadow-white-sm" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-shadow-white-md">Explore Pins</h2>
                <p className="text-blue-100 text-sm text-shadow-white-sm">
                  Discover {pins.length} pins from the community
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

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search pins or users..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 placeholder:text-gray-400"
              />
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most-liked')}
                className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="most-liked">Most Liked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Pins Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredAndSortedPins.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pins found</p>
              <p className="text-sm">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedPins.map((pin) => {
                const isGuestUser = pin.username.match(/^\d{7}$/);
                const likeCount = likeCounts[pin.id] || 0;
                const commentCount = commentCounts[pin.id] || 0;

                return (
                  <div
                    key={pin.id}
                    className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden hover:bg-gray-700 transition-all duration-200 cursor-pointer group"
                  >
                    {/* Pin Image */}
                    {pin.images && pin.images.length > 0 && (
                      <div 
                        onClick={() => handlePinClick(pin.id)}
                        className="relative h-48 overflow-hidden"
                      >
                        <img
                          src={pin.images[0]}
                          alt="Pin image"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {pin.images.length > 1 && (
                          <div className="absolute top-2 right-2 bg-gray-800/50 text-gray-200 px-2 py-1 rounded-full text-xs">
                            +{pin.images.length - 1}
                          </div>
                        )}
                        {/* Like count badge on image */}
                        {likeCount > 0 && (
                          <div className="absolute top-2 left-2 bg-red-500/90 text-white px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1">
                            <Heart className="w-3 h-3" fill="currentColor" />
                            <span>{likeCount}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pin Content */}
                    <div className="p-4">
                      {/* User Info */}
                      <div className="flex items-center space-x-2 mb-3">
                        <button
                          onClick={() => onOpenUserProfile(pin.username)}
                          className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
                        >
                          <User className="w-4 h-4 text-white" />
                        </button>
                        <div className="flex-1">
                          <button
                            onClick={() => onOpenUserProfile(pin.username)}
                            className="font-medium text-sm text-gray-200 hover:text-blue-400 transition-colors"
                          >
                            Guest {pin.username}
                          </button>
                          <p className="text-xs text-gray-400">{formatDate(pin.created_at)}</p>
                        </div>
                      </div>

                      {/* Description */}
                      <button
                        onClick={() => handlePinClick(pin.id)}
                        className="w-full text-left"
                      >
                        <p className="text-sm text-gray-200 line-clamp-3 mb-3 hover:text-gray-100 transition-colors">
                          {pin.description}
                        </p>
                      </button>

                      {/* Engagement Stats */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1 text-gray-400">
                            <Heart className="w-4 h-4" />
                            <span className="text-xs">{likeCount}</span>
                          </div>
                          <div className="flex items-center space-x-1 text-gray-400">
                            <MessageCircle className="w-4 h-4" />
                            <span className="text-xs">{commentCount}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePinClick(pin.id)}
                          className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                        >
                          View on Map
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4 bg-gray-900">
          <div className="text-center text-sm text-gray-400">
            Showing {filteredAndSortedPins.length} of {pins.length} pins
            {sortBy === 'most-liked' && (
              <span className="ml-2 text-red-400">• Sorted by most liked</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreModal;