/**
 * Vehicle Response DTO - matches FastAPI VehicleResponse model
 */
export class VehicleResponseDto {
  id: string;
  vehicle_id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  current_temp: number;
  min_temp: number;
  max_temp: number;
  status: string;
  last_update: string;
  created_at: string;
}
