/**
 * Vehicle Schema - defines the vehicle document structure in MongoDB
 * Matches the Prisma Vehicle model and FastAPI vehicle document
 */
export interface VehicleDocument {
  id: string;           // visibleId - UUID
  vehicle_id: string;   // user-defined vehicle identifier (e.g., TRK-001)
  name: string;
  type: string;         // truck, van, etc.
  latitude: number;
  longitude: number;
  current_temp: number;
  min_temp: number;
  max_temp: number;
  status: string;       // active, inactive, maintenance
  last_update: string;  // ISO string
  created_at: string;   // ISO string
}

/**
 * Create vehicle input
 */
export interface CreateVehicleInput {
  vehicle_id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  min_temp: number;
  max_temp: number;
}
