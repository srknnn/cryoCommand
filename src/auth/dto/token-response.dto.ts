/**
 * User Response DTO - matches FastAPI UserResponse model
 */
export class UserResponseDto {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

/**
 * Token Response DTO - matches FastAPI TokenResponse model
 */
export class TokenResponseDto {
  access_token: string;
  token_type: string = 'bearer';
  user: UserResponseDto;
}
