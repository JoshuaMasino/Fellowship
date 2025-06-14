import React, { useState, useEffect } from 'react';
import MapComponent from './components/Map/MapContainer';
import PinCreationModal from './components/UI/PinCreationModal';
import FloatingControls from './components/UI/FloatingControls';
import UserProfileModal from './components/UI/UserProfileModal';
import ExploreModal from './components/UI/ExploreModal';
import ChatWindow from './components/UI/ChatWindow';
import AuthPage from './components/Auth/AuthPage';
import { Pin, supabase, getCurrentUserProfile } from './lib/supabase';
import { getGuestUsername, setGuestUsername } from './lib/storage';

function App() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [currentUser, setCurrentUser] = useState<string>(getGuestUsername());
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isUserProfileModalOpen, setIsUserProfileModalOpen] = useState(false);
  const [isExploreModalOpen, setIsExploreModalOpen] = useState(false);
  const [isChatWindowOpen, setIsChatWindowOpen] = useState(false);
  const [isAuthPageOpen, setIsAuthPageOpen] = useState(false);
  const [profileToViewUsername, setProfileToViewUsername] = useState('');
  const [pinToOpenOnMap, setPinToOpenOnMap] = useState<string | null>(null);
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null);
  const [firstClickLocation, setFirstClickLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isConnected, setIsConnected] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check authentication status
    checkAuthStatus();
    
    // Fetch initial pins
    fetchPins();

    // Listen for auth open events from profile modal
    const handleOpenAuth = () => {
      setIsAuthPageOpen(true);
    };

    window.addEventListener('openAuth', handleOpenAuth);

    // Set up real-time subscription only if connected
    let subscription: any = null;
    
    if (isConnected) {
      subscription = supabase
        ?.channel('pins')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'pins' },
          () => {
            fetchPins();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('openAuth', handleOpenAuth);
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [isConnected]);

  const checkAuthStatus = async () => {
    if (!supabase) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setIsAuthenticated(!!user);
      
      if (user) {
        const profile = await getCurrentUserProfile();
        if (profile) {
          setCurrentUser(profile.username);
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    }
  };

  const handleOpenUserProfile = (username: string) => {
    setProfileToViewUsername(username);
    setIsUserProfileModalOpen(true);
  };

  const handleSelectPinFromProfile = (pinId: string) => {
    setPinToOpenOnMap(pinId);
    setIsUserProfileModalOpen(false);
  };

  const handleOpenExploreModal = () => {
    setIsExploreModalOpen(true);
  };

  const handleOpenChatWindow = () => {
    setIsChatWindowOpen(true);
  };

  const fetchPins = async () => {
    if (!supabase) {
      setIsConnected(false);
      setPins([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('pins')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching pins:', error);
        setIsConnected(false);
      } else {
        setPins(data || []);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Failed to connect to Supabase:', err);
      setIsConnected(false);
      setPins([]);
    }
  };

  const handleAddPin = (lat: number, lng: number) => {
    console.log('📍 Pin creation initiated:', {
      lat,
      lng,
      isConnected,
      currentUser,
      firstClickLocation
    });
    
    if (!isConnected) {
      console.log('❌ Pin creation blocked: No database connection');
      alert('Cannot add pins - database connection unavailable. Please check your Supabase configuration.');
      return;
    }

    // Two-click pin placement logic
    if (!firstClickLocation) {
      // First click - store location and show temporary marker
      console.log('🎯 First click - storing location for confirmation');
      setFirstClickLocation({ lat, lng });
    } else {
      // Second click - confirm pin creation with first click location
      console.log('✅ Second click - confirming pin creation at first click location');
      setPendingPin(firstClickLocation);
      setIsPinModalOpen(true);
      setFirstClickLocation(null); // Reset first click location
    }
  };

  const handleCreatePin = async (description: string, images: string[], pinColor?: string, storagePaths?: string[]) => {
    console.log('💾 Creating pin with data:', {
      description,
      images,
      pinColor,
      storagePaths,
      pendingPin,
      isConnected,
      currentUser
    });
    
    if (!pendingPin || !isConnected || !supabase) {
      console.log('❌ Pin creation aborted: Missing pendingPin or no connection');
      return;
    }

    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      const isUserAuthenticated = !!user;
      
      console.log('📤 Sending pin to Supabase...');
      const { data, error } = await supabase
        .from('pins')
        .insert([
          {
            username: currentUser,
            lat: pendingPin.lat,
            lng: pendingPin.lng,
            description,
            images,
            pin_color: pinColor || '#FFFC00',
            storage_paths: storagePaths || [],
            is_authenticated: isUserAuthenticated,
          }
        ]);

      if (error) {
        console.error('❌ Supabase insert error:', error);
      } else {
        console.log('✅ Pin created successfully:', data);
        fetchPins();
      }
    } catch (err) {
      console.error('💥 Failed to create pin:', err);
      alert('Failed to create pin - database connection unavailable.');
    }

    setPendingPin(null);
  };

  const handleDeletePin = async (pinId: string) => {
    if (!isConnected || !supabase) {
      alert('Cannot delete pins - database connection unavailable.');
      return;
    }

    try {
      const { error } = await supabase
        .from('pins')
        .delete()
        .eq('id', pinId)
        .eq('username', currentUser);

      if (error) {
        console.error('Error deleting pin:', error);
      } else {
        fetchPins();
      }
    } catch (err) {
      console.error('Failed to delete pin:', err);
      alert('Failed to delete pin - database connection unavailable.');
    }
  };

  const handleLikePin = async (pinId: string, imageIndex: number) => {
    console.log('❤️ Like function called:', {
      pinId,
      imageIndex,
      currentUser,
      isConnected
    });

    if (!isConnected || !supabase) {
      console.log('❌ Like blocked: No database connection');
      alert('Cannot like pins - database connection unavailable.');
      return;
    }

    try {
      console.log('🔍 Checking for existing like...');
      const { data: existingLike, error: selectError } = await supabase
        .from('likes')
        .select('id')
        .eq('pin_id', pinId)
        .eq('image_index', imageIndex)
        .eq('username', currentUser)
        .maybeSingle();

      if (selectError) {
        console.error('❌ Error checking existing like:', selectError);
        return;
      }

      console.log('🔍 Existing like check result:', { existingLike, selectError });

      if (existingLike) {
        console.log('👎 Removing existing like...');
        const { error: deleteError } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (deleteError) {
          console.error('❌ Error deleting like:', deleteError);
        } else {
          console.log('✅ Like removed successfully');
        }
      } else {
        console.log('👍 Adding new like...');
        const { error: insertError } = await supabase
          .from('likes')
          .insert([
            {
              pin_id: pinId,
              image_index: imageIndex,
              username: currentUser,
            }
          ]);

        if (insertError) {
          console.error('❌ Error inserting like:', insertError);
        } else {
          console.log('✅ Like added successfully');
        }
      }
    } catch (err) {
      console.error('💥 Failed to toggle like:', err);
    }
  };

  const handleCommentPin = async (pinId: string, comment: string) => {
    if (!isConnected || !supabase) {
      alert('Cannot add comments - database connection unavailable.');
      return;
    }

    try {
      const { error } = await supabase
        .from('comments')
        .insert([
          {
            pin_id: pinId,
            username: currentUser,
            text: comment,
          }
        ]);

      if (error) {
        console.error('Error adding comment:', error);
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      alert('Failed to add comment - database connection unavailable.');
    }
  };

  const handleUsernameChange = (newUsername: string) => {
    setCurrentUser(newUsername);
    setGuestUsername(newUsername);
    if (isConnected) {
      fetchPins();
    }
  };

  const handleGuestContinue = () => {
    setIsAuthPageOpen(false);
  };

  const handleCancelFirstClick = () => {
    setFirstClickLocation(null);
  };

  // Show auth page if requested
  if (isAuthPageOpen) {
    return <AuthPage onGuestContinue={handleGuestContinue} />;
  }

  console.log('🗺️ Rendering main app');
  return (
    <div className="h-screen w-full bg-blue-500 overflow-hidden relative">
      {/* Map Layer - positioned at the bottom */}
      <div className="absolute inset-0 z-0">
        <MapComponent
          pins={pins}
          onAddPin={handleAddPin}
          onDeletePin={handleDeletePin}
          onLikePin={handleLikePin}
          onCommentPin={handleCommentPin}
          onOpenUserProfile={handleOpenUserProfile}
          currentUser={currentUser}
          isAdmin={false}
          pinToOpenOnMap={pinToOpenOnMap}
          onPinOpened={() => setPinToOpenOnMap(null)}
          firstClickLocation={firstClickLocation}
          onCancelFirstClick={handleCancelFirstClick}
        />
      </div>
      
      {/* UI Layer - positioned above the map */}
      <FloatingControls
        onOpenUserProfile={() => handleOpenUserProfile(currentUser)}
        onOpenExploreModal={handleOpenExploreModal}
        onOpenChatWindow={handleOpenChatWindow}
        totalPins={pins.length}
        currentUser={currentUser}
      />

      <PinCreationModal
        isOpen={isPinModalOpen}
        onClose={() => {
          setIsPinModalOpen(false);
          setPendingPin(null);
        }}
        onSubmit={handleCreatePin}
        lat={pendingPin?.lat || 0}
        lng={pendingPin?.lng || 0}
      />

      <UserProfileModal
        isOpen={isUserProfileModalOpen}
        onClose={() => setIsUserProfileModalOpen(false)}
        username={profileToViewUsername}
        currentUser={currentUser}
        onSelectPin={handleSelectPinFromProfile}
        onUsernameChange={handleUsernameChange}
        isCurrentUserAdmin={false}
      />

      <ExploreModal
        isOpen={isExploreModalOpen}
        onClose={() => setIsExploreModalOpen(false)}
        pins={pins}
        onSelectPin={(pinId) => {
          setPinToOpenOnMap(pinId);
          setIsExploreModalOpen(false);
        }}
        onOpenUserProfile={handleOpenUserProfile}
        currentUser={currentUser}
      />

      <ChatWindow
        isOpen={isChatWindowOpen}
        onClose={() => setIsChatWindowOpen(false)}
        currentUser={currentUser}
        isAuthenticated={isAuthenticated}
      />

      {!isConnected && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
          Database connection unavailable. Please check your Supabase configuration.
        </div>
      )}

      {/* First Click Indicator */}
      {firstClickLocation && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-3">
          <div className="w-3 h-3 bg-blue-300 rounded-full animate-pulse"></div>
          <span className="font-medium">Click again to confirm pin location</span>
          <button
            onClick={handleCancelFirstClick}
            className="ml-2 text-blue-200 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default App;