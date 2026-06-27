import React, { useEffect, useRef } from 'react';
import type { Issue, Category, Severity } from '../types';
import L from 'leaflet';

// Fix default marker icon path issue in leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface InteractiveMapProps {
  issues: Issue[];
  onSelectIssue?: (issueId: string) => void;
  mode?: 'view' | 'select';
  selectedCoordinates?: [number, number];
  onCoordinateSelect?: (coords: [number, number], address: string) => void;
  showHeatmap?: boolean;
  showWardBoundaries?: boolean;
}

const CATEGORY_COLORS: Record<Category, string> = {
  POTHOLE: '#f59e0b',       // Amber
  WATER_LEAK: '#3b82f6',    // Blue
  STREETLIGHT: '#eab308',    // Yellow
  WASTE: '#10b981',          // Green
  SEWAGE: '#a855f7',         // Purple
  ROAD_DAMAGE: '#f97316',    // Orange
  ENCROACHMENT: '#ec4899',   // Pink
  OTHER: '#6b7280',          // Gray
};

const SEVERITY_GLOWS: Record<Severity, string> = {
  CRITICAL: '0 0 16px #f43f5e, inset 0 0 8px #f43f5e',
  HIGH: '0 0 12px #f97316',
  MEDIUM: '0 0 8px #eab308',
  LOW: '0 0 4px #10b981',
};

// Seed administrative boundary coordinates (Anand, Gujarat)
const ANAND_WARD_1: [number, number][] = [
  [22.5650, 72.9100],
  [22.5650, 72.9350],
  [22.5400, 72.9350],
  [22.5400, 72.9100]
];

const ANAND_WARD_2: [number, number][] = [
  [22.5700, 72.9380],
  [22.5700, 72.9580],
  [22.5500, 72.9580],
  [22.5500, 72.9380]
];

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  issues,
  onSelectIssue,
  mode = 'view',
  selectedCoordinates,
  onCoordinateSelect,
  showHeatmap = false,
  showWardBoundaries = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersGroupRef = useRef<L.FeatureGroup | null>(null);
  const heatGroupRef = useRef<L.FeatureGroup | null>(null);
  const wardsGroupRef = useRef<L.FeatureGroup | null>(null);
  const selectorMarkerRef = useRef<L.Marker | null>(null);

  // Address lookup helper using OpenStreetMap reverse-geocoding
  const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      if (response.ok) {
        const data = await response.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      }
    } catch (e) {
      console.error('Reverse geocoding error:', e);
    }
    return `Location near coordinates: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Center of Anand, Gujarat
    const defaultCenter: [number, number] = selectedCoordinates || [22.5645, 72.9289];
    const defaultZoom = mode === 'select' ? 15 : 13;

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(defaultCenter, defaultZoom);

    // Apply CartoDB Dark Matter vector layer
    const baseTile = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
      attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // Add CSS hook to apply dark tiles
    baseTile.getContainer()?.classList.add('dark-leaflet-tiles');

    // Create groups
    markersGroupRef.current = L.featureGroup().addTo(map);
    heatGroupRef.current = L.featureGroup().addTo(map);
    wardsGroupRef.current = L.featureGroup().addTo(map);

    mapInstanceRef.current = map;

    // Handle clicks in select mode
    if (mode === 'select' && onCoordinateSelect) {
      map.on('click', async (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        
        // Move selector marker
        if (selectorMarkerRef.current) {
          selectorMarkerRef.current.setLatLng([lat, lng]);
        } else {
          const pinIcon = L.divIcon({
            html: `<div class="marker-pin-custom bg-brand-500 shadow-glow-primary">
                     <span class="text-white text-xs">📍</span>
                   </div>`,
            className: 'custom-div-icon',
            iconSize: [30, 42],
            iconAnchor: [15, 42]
          });

          selectorMarkerRef.current = L.marker([lat, lng], { 
            icon: pinIcon,
            draggable: true 
          }).addTo(map);

          selectorMarkerRef.current.on('dragend', async (dragEvent) => {
            const marker = dragEvent.target as L.Marker;
            const newPos = marker.getLatLng();
            const addr = await reverseGeocode(newPos.lat, newPos.lng);
            onCoordinateSelect([newPos.lat, newPos.lng], addr);
          });
        }

        const address = await reverseGeocode(lat, lng);
        onCoordinateSelect([lat, lng], address);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Handle map mode and viewport changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (mode === 'select' && selectedCoordinates) {
      map.setView(selectedCoordinates, 15);
      
      // Update or create select marker
      if (selectorMarkerRef.current) {
        selectorMarkerRef.current.setLatLng(selectedCoordinates);
      } else {
        const pinIcon = L.divIcon({
          html: `<div class="marker-pin-custom bg-brand-500 shadow-glow-primary">
                   <span class="text-white text-xs">📍</span>
                 </div>`,
          className: 'custom-div-icon',
          iconSize: [30, 42],
          iconAnchor: [15, 42]
        });

        selectorMarkerRef.current = L.marker(selectedCoordinates, {
          icon: pinIcon,
          draggable: true
        }).addTo(map);

        selectorMarkerRef.current.on('dragend', async (dragEvent) => {
          const marker = dragEvent.target as L.Marker;
          const newPos = marker.getLatLng();
          if (onCoordinateSelect) {
            const addr = await reverseGeocode(newPos.lat, newPos.lng);
            onCoordinateSelect([newPos.lat, newPos.lng], addr);
          }
        });
      }
    } else {
      // Remove select pin in view mode
      if (selectorMarkerRef.current) {
        selectorMarkerRef.current.remove();
        selectorMarkerRef.current = null;
      }
    }
  }, [mode, selectedCoordinates]);

  // 3. Render Markers & Heatmaps
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersGroup = markersGroupRef.current;
    const heatGroup = heatGroupRef.current;

    if (!map || !markersGroup || !heatGroup) return;

    markersGroup.clearLayers();
    heatGroup.clearLayers();

    if (mode === 'view') {
      issues.forEach((issue) => {
        const [lat, lng] = issue.location.coordinates;
        const color = CATEGORY_COLORS[issue.category] || '#6b7280';
        const glow = SEVERITY_GLOWS[issue.severity];

        // A. Draw Heatmap density overlay rings
        if (showHeatmap) {
          const radius = issue.severity === 'CRITICAL' ? 180 : issue.severity === 'HIGH' ? 120 : 60;
          const pulseColor = issue.severity === 'CRITICAL' ? '#f43f5e' : issue.severity === 'HIGH' ? '#f97316' : '#eab308';
          
          L.circle([lat, lng], {
            radius,
            color: pulseColor,
            weight: 1,
            fillColor: pulseColor,
            fillOpacity: 0.15,
            className: 'heatmap-pulse'
          }).addTo(heatGroup);
        }

        // B. Render standard pins
        const iconHtml = `
          <div class="relative w-8 h-8 rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform duration-200" 
               style="background-color: ${color}; box-shadow: ${glow};">
            <span class="text-xs text-white drop-shadow font-bold">
              ${issue.category === 'POTHOLE' ? '🕳️' : issue.category === 'WATER_LEAK' ? '💧' : issue.category === 'WASTE' ? '🗑️' : issue.category === 'STREETLIGHT' ? '💡' : issue.category === 'SEWAGE' ? '☣️' : '⚠️'}
            </span>
          </div>
        `;

        const pinIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-div-icon',
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        // Popup construction with visual indicators
        const severityBadgeColor = 
          issue.severity === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' :
          issue.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' :
          issue.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
          'bg-teal-500/20 text-teal-300 border-teal-500/30';

        const statusColors = {
          SUBMITTED: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
          UNDER_REVIEW: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          VERIFIED: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
          ASSIGNED: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
          IN_PROGRESS: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          RESOLVED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          CLOSED: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
        };

        const popupContent = document.createElement('div');
        popupContent.className = 'flex flex-col gap-2 min-w-[200px] text-xs font-sans';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between border-b border-white/10 pb-1.5 mb-1">
            <span class="font-extrabold text-slate-100 uppercase tracking-wide text-[10px]">
              ${issue.category}
            </span>
            <span class="px-1.5 py-0.5 rounded text-[9px] font-bold border ${statusColors[issue.status]}">
              ${issue.status}
            </span>
          </div>
          <h4 class="font-bold text-slate-100 text-sm leading-tight">${issue.title}</h4>
          <p class="text-slate-400 text-[11px] leading-relaxed truncate">${issue.location.address}</p>
          <div class="flex items-center gap-2 mt-1.5">
            <span class="px-1.5 py-0.5 text-[9px] rounded font-bold border ${severityBadgeColor}">
              Severity: ${issue.severity}
            </span>
            <span class="text-[10px] text-slate-500">
              👍 ${issue.upvotes} | ✅ ${issue.verificationCount}/3
            </span>
          </div>
          <button id="view-details-btn-${issue.id}" class="w-full mt-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-1.5 rounded-lg transition text-[10.5px]">
            Inspect Incident
          </button>
        `;

        // Bind callback safely
        const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(markersGroup);
        marker.bindPopup(popupContent);

        marker.on('popupopen', () => {
          const btn = document.getElementById(`view-details-btn-${issue.id}`);
          if (btn && onSelectIssue) {
            btn.onclick = () => {
              onSelectIssue(issue.id);
              marker.closePopup();
            };
          }
        });
      });
    }
  }, [issues, showHeatmap, mode]);

  // 4. Draw Ward Overlays
  useEffect(() => {
    const map = mapInstanceRef.current;
    const wardsGroup = wardsGroupRef.current;

    if (!map || !wardsGroup) return;

    wardsGroup.clearLayers();

    if (showWardBoundaries && mode === 'view') {
      // Draw Anand Ward 1
      L.polygon(ANAND_WARD_1, {
        color: '#8b5cf6',
        weight: 1.5,
        fillColor: '#8b5cf6',
        fillOpacity: 0.08,
        dashArray: '5, 5'
      }).addTo(wardsGroup)
        .bindTooltip("Ward 1 (Vallabh Vidyanagar) - Active Pothole Alert", { permanent: false, direction: "center" });

      // Draw Anand Ward 2
      L.polygon(ANAND_WARD_2, {
        color: '#10b981',
        weight: 1.5,
        fillColor: '#10b981',
        fillOpacity: 0.08,
        dashArray: '5, 5'
      }).addTo(wardsGroup)
        .bindTooltip("Ward 2 (Amul Dairy Road) - Waterlogged Sector", { permanent: false, direction: "center" });
    }
  }, [showWardBoundaries, mode]);

  return (
    <div className="relative w-full h-full min-h-[350px] bg-dark-950 rounded-2xl overflow-hidden border border-white/10 shadow-glass">
      <div ref={mapContainerRef} className="w-full h-full" style={{ minHeight: '350px' }} />
      {mode === 'select' && (
        <div className="absolute top-3 left-12 z-[1000] bg-slate-900/90 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] text-slate-300 max-w-xs backdrop-blur">
          📌 <span className="font-bold text-slate-100">Pin Selector Mode:</span> Click anywhere on the map to pinpoint coordinate location. You can also drag the pin.
        </div>
      )}
    </div>
  );
};
export default InteractiveMap;
