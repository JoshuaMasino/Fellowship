import React, { useState, useEffect } from 'react';
import { X, MapPin, User, Heart, MessageCircle, Search, Filter, Globe, ChevronDown } from 'lucide-react';
import { Pin, supabase } from '../../lib/supabase';
import { getUniqueLocations } from '../../lib/geocoding';

interface LocationFilters {
  continent: string;
  country: string;
  state: string;
  locality: string;
}

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
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most-liked'>('most-liked'); // Default to most-liked
  const [locationFilters, setLocationFilters] = useState<LocationFilters>({
    continent: '',
    country: '',
    state: '',
    locality: '',
  });
  const [showLocationFilters, setShowLocationFilters] = useState(false);
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>({});
  const [uniqueLocations, setUniqueLocations] = useState({
    continents: [] as string[],
    countries: [] as string[],
    states: [] as string[],
    localities: [] as string[],
  });

  useEffect(() => {
    if (isOpen) {
      fetchEngagementData();
      setUniqueLocations(getUniqueLocations(pins));
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
    .filter(pin => {
      // Text search filter
      const matchesSearch = pin.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pin.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Location filters
      const matchesContinent = !locationFilters.continent || pin.continent === locationFilters.continent;
      const matchesCountry = !locationFilters.country || pin.country === locationFilters.country;
      const matchesState = !locationFilters.state || pin.state === locationFilters.state;
      const matchesLocality = !locationFilters.locality || pin.locality === locationFilters.locality;
      
      return matchesSearch && matchesContinent && matchesCountry && matchesState && matchesLocality;
    })
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

  const handleLocationFilterChange = (filterType: keyof LocationFilters, value: string) => {
    setLocationFilters(prev => {
      const newFilters = { ...prev, [filterType]: value };
      
      // Clear dependent filters when parent filter changes
      if (filterType === 'continent') {
        newFilters.country = '';
        newFilters.state = '';
        newFilters.locality = '';
      } else if (filterType === 'country') {
        newFilters.state = '';
        newFilters.locality = '';
      } else if (filterType === 'state') {
        newFilters.locality = '';
      }
      
      return newFilters;
    });
  };

  const clearLocationFilters = () => {
    setLocationFilters({
      continent: '',
      country: '',
      state: '',
      locality: '',
    });
  };

  const getFilteredOptions = (filterType: keyof LocationFilters) => {
    let filteredPins = pins;
    
    // Apply parent filters
    if (filterType === 'country' && locationFilters.continent) {
      filteredPins = pins.filter(pin => pin.continent === locationFilters.continent);
    } else if (filterType === 'state' && locationFilters.country) {
      filteredPins = pins.filter(pin => 
        pin.country === locationFilters.country &&
        (!locationFilters.continent || pin.continent === locationFilters.continent)
      );
    } else if (filterType === 'locality' && locationFilters.state) {
      filteredPins = pins.filter(pin => 
        pin.state === locationFilters.state &&
        (!locationFilters.country || pin.country === locationFilters.country) &&
        (!locationFilters.continent || pin.continent === locationFilters.continent)
      );
    }
    
    const locations = getUniqueLocations(filteredPins);
    
    switch (filterType) {
      case 'continent': return locations.continents;
      case 'country': return locations.countries;
      case 'state': return locations.states;
      case 'locality': return locations.localities;
      default: return [];
    }
  };

  const hasActiveLocationFilters = Object.values(locationFilters).some(filter => filter !== '');

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
          <div className="flex flex-col gap-4">
            {/* Main Search and Sort Row */}
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
                  <option value="most-liked">Most Liked</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Location Filter Toggle */}
              <button
                onClick={() => setShowLocationFilters(!showLocationFilters)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg border transition-colors ${
                  showLocationFilters || hasActiveLocationFilters
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
                }`}
              >
                <Globe className="w-5 h-5" />
                <span>Location</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showLocationFilters ? 'rotate-180' : ''}`} />
                {hasActiveLocationFilters && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                )}
              </button>
            </div>

            {/* Location Filters */}
            {showLocationFilters && (
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-200">Filter by Location</h3>
                  {hasActiveLocationFilters && (
                    <button
                      onClick={clearLocationFilters}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Continent Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Continent</label>
                    <select
                      value={locationFilters.continent}
                      onChange={(e) => handleLocationFilterChange('continent', e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 text-sm"
                    >
                      <option value="">All Continents</option>
                      {getFilteredOptions('continent').map(continent => (
                        <option key={continent} value={continent}>{continent}</option>
                      ))}
                    </select>
                  </div>

                  {/* Country Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Country</label>
                    <select
                      value={locationFilters.country}
                      onChange={(e) => handleLocationFilterChange('country', e.target.value)}
                      disabled={!locationFilters.continent}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">All Countries</option>
                      {getFilteredOptions('country').map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>

                  {/* State Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">State/Province</label>
                    <select
                      value={locationFilters.state}
                      onChange={(e) => handleLocationFilterChange('state', e.target.value)}
                      disabled={!locationFilters.country}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">All States</option>
                      {getFilteredOptions('state').map(state => (
                        <option key={state} value={state}>{state}</option>
                      ))}
                    </select>
                  </div>

                  {/* Locality Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">City/Town</label>
                    <select
                      value={locationFilters.locality}
                      onChange={(e) => handleLocationFilterChange('locality', e.target.value)}
                      disabled={!locationFilters.state}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">All Cities</option>
                      {getFilteredOptions('locality').map(locality => (
                        <option key={locality} value={locality}>{locality}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasActiveLocationFilters && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {locationFilters.continent && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {locationFilters.continent}
                        <button
                          onClick={() => handleLocationFilterChange('continent', '')}
                          className="ml-1 hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {locationFilters.country && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {locationFilters.country}
                        <button
                          onClick={() => handleLocationFilterChange('country', '')}
                          className="ml-1 hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {locationFilters.state && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {locationFilters.state}
                        <button
                          onClick={() => handleLocationFilterChange('state', '')}
                          className="ml-1 hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                    {locationFilters.locality && (
                      <span className="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                        {locationFilters.locality}
                        <button
                          onClick={() => handleLocationFilterChange('locality', '')}
                          className="ml-1 hover:text-gray-300"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pins Grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {filteredAndSortedPins.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No pins found</p>
              <p className="text-sm">Try adjusting your search terms or location filters</p>
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

                      {/* Location Info */}
                      {(pin.locality || pin.state || pin.country) && (
                        <div className="mb-2 text-xs text-gray-500">
                          <Globe className="w-3 h-3 inline mr-1" />
                          {[pin.locality, pin.state, pin.country].filter(Boolean).join(', ')}
                        </div>
                      )}

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
            {hasActiveLocationFilters && (
              <span className="ml-2 text-blue-400">• Location filtered</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExploreModal;