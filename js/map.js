// js/map.js
// -------------------------------------------------------
// Leaflet.js map helpers.
//
// Two public functions:
//   initCreateMap(onSelect)   — small picker map inside the create modal
//   initViewMap(lat, lng)     — read-only pin for game detail (future use)
// -------------------------------------------------------

import { LOCATIONS, MAP_CENTER, MAP_ZOOM } from './locations.js';

// Custom accent-coloured marker icon
function makeMarkerIcon(selected = false) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: 28px; height: 28px;
      background: ${selected ? '#f5c518' : '#2a3040'};
      border: 2px solid ${selected ? '#c49a10' : '#7a8298'};
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
      cursor: pointer;
    ">📍</div>`,
    iconSize:   [28, 28],
    iconAnchor: [14, 14],
  });
}

/**
 * Initialises the location-picker map inside the create-game modal.
 *
 * @param {function} onSelect  Called with the chosen location object when a
 *                             marker is clicked: { name, lat, lng }
 * @returns {object} Leaflet map instance (so the caller can invalidate size)
 */
export function initCreateMap(onSelect) {
  const map = L.map('create-map', { zoomControl: true }).setView(
    [MAP_CENTER.lat, MAP_CENTER.lng],
    MAP_ZOOM,
  );

  // OpenStreetMap tiles (free, no key needed)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
    maxZoom: 19,
  }).addTo(map);

  let selectedMarker = null;

  LOCATIONS.forEach(loc => {
    const marker = L.marker([loc.lat, loc.lng], { icon: makeMarkerIcon(false) })
      .addTo(map)
      .bindPopup(`<strong>${loc.name}</strong><br><small>${loc.sports.join(' · ')}</small>`);

    marker.on('click', () => {
      // Reset previously selected marker
      if (selectedMarker && selectedMarker !== marker) {
        selectedMarker.setIcon(makeMarkerIcon(false));
      }
      marker.setIcon(makeMarkerIcon(true));
      selectedMarker = marker;

      // Notify parent
      onSelect({ name: loc.name, lat: loc.lat, lng: loc.lng });
      marker.openPopup();
    });
  });

  return map;
}
