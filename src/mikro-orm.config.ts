import { Options, PostgreSqlDriver } from '@mikro-orm/postgresql';

const config: Options = {
  driver: PostgreSqlDriver,
  dbName: process.env.POSTGRES_DB || 'wager_db',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'password',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  clientUrl: 'postgresql://postgres:password@localhost:5432/wager_db',
  entities: ['./dist/infra/database/schemas/*.schema.js'],
  entitiesTs: ['./src/infra/database/schemas/*.schema.ts'],
  migrations: {
    path: './src/migrations',
    transactional: true,
  },
  debug: process.env.NODE_ENV !== 'production',
};

export default config;