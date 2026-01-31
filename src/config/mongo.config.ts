import { ConfigService } from '@nestjs/config';

/**
 * MongoDB Configuration
 *
 * Prisma handles MongoDB connection via the DATABASE_URL in .env
 * This config file provides helper utilities for MongoDB-specific settings
 */
export const mongoConfig = {
  /**
   * Get MongoDB URL from environment
   */
  getMongoUrl: (configService: ConfigService): string => {
    return configService.get<string>('MONGO_URL', 'mongodb://localhost:27017');
  },

  /**
   * Get database name from environment
   */
  getDatabaseName: (configService: ConfigService): string => {
    return configService.get<string>('DB_NAME', 'coldchain');
  },

  /**
   * Build full MongoDB connection string with database name
   */
  getConnectionString: (configService: ConfigService): string => {
    const url = mongoConfig.getMongoUrl(configService);
    const dbName = mongoConfig.getDatabaseName(configService);

    // If URL already contains database name, return as is
    if (url.includes('?') || url.split('/').length > 3) {
      return url;
    }

    return `${url}/${dbName}`;
  },
};

export type MongoConfig = typeof mongoConfig;
