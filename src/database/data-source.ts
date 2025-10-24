import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load .env file contents
config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'], // Note: Use .js extension for compiled code
  migrations: ['src/database/migrations/*.ts'], // Note: Use .js extension
  logging: true,
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
