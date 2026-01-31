import { Role } from '../constants/roles';

/**
 * User interface representing the authenticated user
 * Attached to request object after JWT validation
 */
export interface IUser {
  id: string;
  email: string;
  name: string;
  role: Role | string;
  created_at: string;
}

/**
 * JWT Token payload user info
 */
export interface IJwtUser {
  sub: string; // user id
  role: string;
}

/**
 * Request with authenticated user
 */
export interface IAuthenticatedRequest extends Request {
  user: IUser;
}

/**
 * User creation DTO interface
 */
export interface IUserCreate {
  email: string;
  password: string;
  name: string;
  role?: string;
}

/**
 * User login DTO interface
 */
export interface IUserLogin {
  email: string;
  password: string;
}

/**
 * User response (without password)
 */
export interface IUserResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

/**
 * Token response interface
 */
export interface ITokenResponse {
  access_token: string;
  token_type: string;
  user: IUserResponse;
}
