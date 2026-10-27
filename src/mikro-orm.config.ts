import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';

const config: Options = {
  driver: PostgreSqlDriver,
  dbName: process.env.POSTGRES_DB || 'wager_db',
  user: process.env.POSTGRES_USER || 'wager_user',
  password: process.env.POSTGRES_PASSWORD || 'wager_password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  entities: ['./dist/infra/database/schemas/*.schema.js'],
  entitiesTs: ['./src/infra/database/schemas/*.schema.ts'],
  migrations: {
    path: './src/migrations',
    transactional: true,
  },
  debug: process.env.NODE_ENV !== 'production',
};

export default config;