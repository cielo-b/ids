import { TypeOrmModuleOptions } from "@nestjs/typeorm";

/**
 * Database configuration for PostgreSQL
 * All services now use PostgreSQL for data persistence
 */
export const getDatabaseConfig = (
  host: string,
  port: number,
  username: string,
  password: string,
  database: string,
  entities: any[],
  synchronize = false
): TypeOrmModuleOptions => ({
  type: "postgres",
  host,
  port,
  username,
  password,
  database,
  entities,
  synchronize,
  logging: process.env.NODE_ENV === "development",
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
