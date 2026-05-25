export interface LocationRecord {
  id: string;
  address: string;
  lat: number;
  lng: number;
  date: string;
  time: string;
  accuracy?: number;
}

export const locationHistory: LocationRecord[] = [
  { id: '1', address: '123 Main St, New York, NY', lat: 40.7128, lng: -74.006, date: '2025-02-27', time: '10:30', accuracy: 15 },
  { id: '2', address: '456 Oak Ave, Brooklyn, NY', lat: 40.6782, lng: -73.9442, date: '2025-02-27', time: '09:00', accuracy: 20 },
  { id: '3', address: '789 Park Rd, Queens, NY', lat: 40.7282, lng: -73.7949, date: '2025-02-26', time: '18:30', accuracy: 10 },
  { id: '4', address: '321 Elm St, Manhattan, NY', lat: 40.7589, lng: -73.9851, date: '2025-02-26', time: '14:00', accuracy: 25 },
  { id: '5', address: '654 Pine Blvd, Bronx, NY', lat: 40.8448, lng: -73.8648, date: '2025-02-25', time: '16:00', accuracy: 18 },
  { id: '6', address: '987 Lake Dr, Staten Island, NY', lat: 40.5795, lng: -74.1502, date: '2025-02-25', time: '11:30', accuracy: 30 },
];
