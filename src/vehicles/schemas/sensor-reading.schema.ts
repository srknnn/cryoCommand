/**
 * Sensor Reading Schema - defines the sensor reading document structure in MongoDB
 * Matches the Prisma SensorReading model and FastAPI sensor reading document
 */
export interface SensorReadingDocument {
  id: string;           // visibleId - UUID
  vehicle_id: string;   // reference to vehicle's visibleId
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  timestamp: string;    // ISO string
}
