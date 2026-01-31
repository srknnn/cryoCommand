/**
 * Sensor Reading Response DTO - matches FastAPI SensorReadingResponse model
 */
export class SensorReadingResponseDto {
  id: string;
  vehicle_id: string;
  temperature: number;
  humidity: number;
  latitude: number;
  longitude: number;
  timestamp: string;
}
