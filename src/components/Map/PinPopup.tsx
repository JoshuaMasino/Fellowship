import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Trash2, X, User } from 'lucide-react';
import { Pin, Comment, supabase } from '../../lib/supabase';

interface PinPopupProps {
  pin: Pin;
  currentUser: string;
  isAdmin?: boolean;
  onDelete: () => void;
  onLike: (pinId: string, imageIndex: number) => void;
  onComment: (pinId: string, comment: string) => void;
  onOpenUserProfile: (username: string) => void;
  onClose: () => void;
}

const PinPopup: React.FC<PinPopupProps> = ({
  pin,
  currentUser,
  isAdmin = false,
  onDelete,
  onLike,
  onComment,
  onOpenUserProfile,
  onClose,
}) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [likes, setLikes] = useState<{ [key: number]: number }>({});
  const [userLikes, setUserLikes] = useState<{ [key: number]: boolean }>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    console.log('🔄 PinPopup useEffect triggered for pin:', pin.id);
    fetchComments();
    fetchLikes();
  }, [pin.id, currentUser]);

  const fetchComments = async () => {
    console.log('💬 Fetching comments for pin:', pin.id);
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .eq('pin_id', pin.id)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('❌ Error fetching comments:', error);
    } else {
      console.log('✅ Comments fetched:', data?.length || 0);
      setComments(data || []);
    }
  };

  const fetchLikes = async () => {
    console.log('❤️ Fetching likes for pin:', pin.id, 'currentUser:', currentUser);
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('pin_id', pin.id);
    
    if (error) {
      console.error('❌ Error fetching likes:', error);
      return;
    }

    console.log('✅ Likes data fetched:', data);
    
    if (data) {
      const likeCounts: { [key: number]: number } = {};
      const userLikeStatus: { [key: number]: boolean } = {};
      
      data.forEach((like) => {
        likeCounts[like.image_index] = (likeCounts[like.image_index] || 0) + 1;
        if (like.username === currentUser) {
          userLikeStatus[like.image_index] = true;
        }
      });
      
      console.log('📊 Processed like counts:', likeCounts);
      console.log('👤 User like status:', userLikeStatus);
      
      setLikes(likeCounts);
      setUserLikes(userLikeStatus);
    }
  };

  const handleComment = async () => {
    if (newComment.trim() && newComment.length <= 100) {
      await onComment(pin.id, newComment.trim());
      setNewComment('');
      fetchComments();
    }
  };

  const handleLike = async (imageIndex: number) => {
    console.log('👆 Like button clicked for image index:', imageIndex);
    console.log('🔍 Current user likes state:', userLikes);
    console.log('🔍 Current like counts:', likes);
    
    await onLike(pin.id, imageIndex);
    // Refresh likes after the operation
    setTimeout(() => {
      fetchLikes();
    }, 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canDelete = pin.username === currentUser;
  const isGuestUser = pin.username.match(/^\d{7}$/);

  // Calculate total likes across all images
  const totalLikes = Object.values(likes).reduce((sum, count) => sum + count, 0);

  const handleDeleteClick = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    onDelete();
    setShowDeleteConfirmation(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirmation(false);
  };

  return (
    <div className="bg-gray-900 rounded-2xl shadow-2xl p-0 overflow-hidden max-w-sm relative">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center">
          <div className="bg-gray-800 rounded-xl p-6 mx-4 max-w-sm w-full border border-gray-700">
            <h3 className="text-lg font-semibold text-gray-200 mb-3 text-center">
              Are you sure?
            </h3>
            <p className="text-gray-400 text-sm mb-6 text-center">
              This action cannot be undone. Your pin will be permanently deleted.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                No, Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="glass-header p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenUserProfile(pin.username)}
              className="w-8 h-8 glass-white rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <User className="w-4 h-4 text-gray-600 icon-shadow-white-sm" />
            </button>
            <div>
              <button
                onClick={() => onOpenUserProfile(pin.username)}
                className="font-semibold text-sm hover:underline transition-all text-shadow-white-sm"
              >
                Guest {pin.username}
              </button>
              <p className="text-xs opacity-90 text-shadow-white-sm">{formatDate(pin.created_at)}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {canDelete && (
              <button
                onClick={handleDeleteClick}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
                title="Delete your pin"
              >
                <Trash2 className="w-4 h-4 icon-shadow-white-sm" />
              </button>
            )}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="p-1 hover:bg-white/20 rounded-full transition-colors"
              title="Close pin"
            >
              <X className="w-4 h-4 icon-shadow-white-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Images */}
      {pin.images && pin.images.length > 0 && (
        <div className="relative">
          <img
            src={pin.images[selectedImageIndex]}
            alt="Pin image"
            className="w-full h-48 object-cover"
          />
          
          {/* Image navigation */}
          {pin.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
              {pin.images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* FIXED LIKE BUTTON - Made it much more prominent and clickable */}
          <div className="absolute top-3 right-3">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('💖 HEART BUTTON CLICKED! Image index:', selectedImageIndex);
                console.log('💖 Current user:', currentUser);
                console.log('💖 Pin ID:', pin.id);
                handleLike(selectedImageIndex);
              }}
              className={`
                flex items-center justify-center
                w-12 h-12 
                rounded-full 
                border-2 border-white
                shadow-lg
                transition-all duration-200 
                transform hover:scale-110 active:scale-95
                ${userLikes[selectedImageIndex]
                  ? 'bg-red-500 text-white' 
                  : 'bg-white/90 text-red-500 hover:bg-white'
                }
              `}
              style={{ 
                zIndex: 1000,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
              type="button"
            >
              <Heart
                className="w-6 h-6"
                fill={userLikes[selectedImageIndex] ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth={2}
              />
            </button>
          </div>

          {/* Like count badge */}
          {likes[selectedImageIndex] > 0 && (
            <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
              {likes[selectedImageIndex]} ❤️
            </div>
          )}
        </div>
      )}

      {/* Description */}
      <div className="p-4">
        <p className="text-gray-200 text-sm leading-relaxed">{pin.description}</p>
      </div>

      {/* Comments Section */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Heart className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-200">
              {totalLikes} likes
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <MessageCircle className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-200">
              {comments.length} comments
            </span>
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
          {comments.map((comment) => {
            const isCommentFromGuest = comment.username.match(/^\d{7}$/);
            return (
              <div key={comment.id} className="text-sm">
                <button
                  onClick={() => onOpenUserProfile(comment.username)}
                  className="font-medium text-blue-400 hover:underline"
                >
                  Guest {comment.username}
                </button>
                <span className="text-gray-200 ml-2">{comment.text}</span>
              </div>
            );
          })}
        </div>

        {/* Add comment */}
        <div className="flex space-x-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            maxLength={100}
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-200 placeholder:text-gray-400"
          />
          <button
            onClick={handleComment}
            disabled={!newComment.trim()}
            className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full text-sm font-medium hover:from-yellow-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Post
          </button>
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {newComment.length}/100 characters
        </div>
      </div>
    </div>
  );
};

export default PinPopup;