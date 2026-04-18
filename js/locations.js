// js/locations.js
// -------------------------------------------------------
// Predefined sports locations near Hagen, Germany.
// Each entry has a name, coordinates, and supported sports.
// Add or remove entries freely — they populate the map markers.
// -------------------------------------------------------

export const LOCATIONS = [
  {
    name: 'Ischelandstadion',
    lat: 51.3697,
    lng: 7.4845,
    sports: ['football', 'basketball'],
  },
  {
    name: 'Sportpark Hagen-Mitte',
    lat: 51.3574,
    lng: 7.4660,
    sports: ['football'],
  },
  {
    name: 'FernUniversität Sportplatz',
    lat: 51.3783,
    lng: 7.4958,
    sports: ['football', 'basketball'],
  },
  {
    name: 'Haspe Basketball Court',
    lat: 51.3450,
    lng: 7.4310,
    sports: ['basketball'],
  },
  {
    name: 'Hohenlimburg Sportanlage',
    lat: 51.3294,
    lng: 7.5701,
    sports: ['football'],
  },
  {
    name: 'Hagen City Park Field',
    lat: 51.3620,
    lng: 7.4750,
    sports: ['football', 'basketball'],
  },
  {
    name: 'Fachhochschule Südwestfalen',
    lat: 51.3607,
    lng: 7.4836,
    sports: ['University location as reference point, not a sports venue'],
  },
];

// Centre the map on Hagen
export const MAP_CENTER = { lat: 51.362, lng: 7.473 };
export const MAP_ZOOM   = 13;
