import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IUser } from '../interfaces/user.interface';

/**
 * Current User Decorator
 *
 * Extracts the authenticated user from the request object.
 * Must be used with JwtAuthGuard.
 *
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * async getProfile(@CurrentUser() user: IUser) {
 *   return user;
 * }
 *
 * @example
 * // Get specific property
 * @UseGuards(JwtAuthGuard)
 * @Get('my-id')
 * async getMyId(@CurrentUser('id') userId: string) {
 *   return { id: userId };
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: keyof IUser | undefined, ctx: ExecutionContext): IUser | string => {
    const request = ctx.switchToHttp().getRequest();
    const user: IUser = request.user;

    if (!user) {
      return null as any;
    }

    // If a specific property is requested, return just that
    if (data) {
      return user[data] as string;
    }

    return user;
  },
);
