import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMapEvents, Marker, Popup } from 'react-leaflet';
import { LatLng, Icon, Map as LeafletMap } from 'leaflet';
import { Plus, Minus, Layers } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { Pin } from '../../lib/supabase';
import PinPopup from './PinPopup';

// Custom pin icon
const createPinIcon = (color: string = '#FFFC00') => new Icon({
  iconUrl: `data:image/svg+xml;base64,${btoa(`
    <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.163 0 0 7.163 0 16C0 28 16 42 16 42S32 28 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
    </svg>
  `)}`,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

interface MapEventsProps {
  onMapClick: (latlng: LatLng) => void;
  isPinPopupOpen: boolean;
}

const MapEvents: React.FC<MapEventsProps> = ({ onMapClick, isPinPopupOpen }) => {
  useMapEvents({
    click: (e) => {
      // Only create a pin if no popup is currently open
      if (!isPinPopupOpen) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
};

interface MapComponentProps {
  pins: Pin[];
  onAddPin: (lat: number, lng: number) => void;
  onDeletePin: (pinId: string) => void;
  onLikePin: (pinId: string, imageIndex: number) => void;
  onCommentPin: (pinId: string, comment: string) => void;
  onOpenUserProfile: (username: string) => void;
  currentUser: string;
  isAdmin?: boolean;
  pinToOpenOnMap?: string | null;
  onPinOpened?: () => void;
}

const MapComponent: React.FC<MapComponentProps> = ({
  pins,
  onAddPin,
  onDeletePin,
  onLikePin,
  onCommentPin,
  onOpenUserProfile,
  currentUser,
  isAdmin = false,
  pinToOpenOnMap,
  onPinOpened,
}) => {
  const mapRef = useRef<LeafletMap>(null);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [mapType, setMapType] = useState<'osm' | 'satellite'>('osm');
  const [isPinPopupOpen, setIsPinPopupOpen] = useState(false);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});

  // Map tile layer configurations
  const tileLayerConfig = {
    osm: {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    },
    satellite: {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }
  };

  const handleMapClick = (latlng: LatLng) => {
    onAddPin(latlng.lat, latlng.lng);
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleToggleMapType = () => {
    setMapType(prev => prev === 'osm' ? 'satellite' : 'osm');
  };

  const handlePinClick = (pin: Pin) => {
    setSelectedPin(pin);
    setIsPinPopupOpen(true);
  };

  const handlePopupClose = () => {
    setSelectedPin(null);
    setIsPinPopupOpen(false);
  };

  // Force close popup when clicking the close button
  const handleForceClosePopup = () => {
    setSelectedPin(null);
    setIsPinPopupOpen(false);
    // Force close the Leaflet popup
    if (mapRef.current) {
      mapRef.current.closePopup();
    }
  };

  // Handle opening specific pin from profile
  useEffect(() => {
    if (pinToOpenOnMap && mapRef.current) {
      const pinToOpen = pins.find(pin => pin.id === pinToOpenOnMap);
      if (pinToOpen) {
        // Center map on the pin
        mapRef.current.setView([pinToOpen.lat, pinToOpen.lng], 15);
        
        // Set the selected pin to open its popup
        setSelectedPin(pinToOpen);
        setIsPinPopupOpen(true);
        
        // Find and open the marker's popup
        const marker = markersRef.current[pinToOpen.id];
        if (marker) {
          setTimeout(() => {
            marker.openPopup();
          }, 500); // Small delay to ensure map has centered
        }
        
        // Clear the pin to open
        if (onPinOpened) {
          onPinOpened();
        }
      }
    }
  }, [pinToOpenOnMap, pins, onPinOpened]);

  return (
    <div className="h-screen w-full relative">
      <MapContainer
        center={[40.7128, -74.0060]} // NYC coordinates
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        ref={mapRef}
        zoomControl={false}
      >
        <TileLayer
          attribution={tileLayerConfig[mapType].attribution}
          url={tileLayerConfig[mapType].url}
        />
        <MapEvents onMapClick={handleMapClick} isPinPopupOpen={isPinPopupOpen} />
        
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.lat, pin.lng]}
            icon={createPinIcon(pin.pin_color || '#FFFC00')}
            ref={(ref) => {
              if (ref) {
                markersRef.current[pin.id] = ref;
              }
            }}
            eventHandlers={{
              click: () => handlePinClick(pin),
            }}
          >
            <Popup
              closeButton={false}
              className="custom-popup"
              minWidth={320}
              maxWidth={400}
              eventHandlers={{
                remove: () => handlePopupClose(),
              }}
            >
              <PinPopup
                pin={pin}
                currentUser={currentUser}
                isAdmin={isAdmin}
                onDelete={() => {
                  onDeletePin(pin.id);
                  handlePopupClose();
                }}
                onLike={onLikePin}
                onComment={onCommentPin}
                onOpenUserProfile={onOpenUserProfile}
                onClose={handleForceClosePopup}
              />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-[1000] space-y-3">
        {/* Zoom In Button */}
        <button
          onClick={handleZoomIn}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title="Zoom In"
        >
          <Plus className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>

        {/* Zoom Out Button */}
        <button
          onClick={handleZoomOut}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title="Zoom Out"
        >
          <Minus className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>

        {/* Map Type Toggle Button */}
        <button
          onClick={handleToggleMapType}
          className="w-14 h-14 glass-blue rounded-full shadow-xl flex items-center justify-center hover:bg-blue-200/30 hover:scale-105 transition-all duration-200"
          title={mapType === 'osm' ? 'Switch to Satellite' : 'Switch to Map'}
        >
          <Layers className="w-6 h-6 text-blue-700 icon-shadow-white-sm" />
        </button>
      </div>
    </div>
  );
};

export default MapComponent;