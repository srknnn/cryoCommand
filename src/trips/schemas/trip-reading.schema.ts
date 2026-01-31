/**
 * Trip Reading Schema - defines the trip reading document structure in MongoDB
 * Matches the Prisma TripReading model and FastAPI trip reading document
 */
export interface TripReadingDocument {
  id: string;           // visibleId - UUID
  trip_id: string;
  vehicle_id: string;
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  timestamp: string;    // ISO string
}
