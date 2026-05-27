import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';
dotenv.config();

if (!process.env.DB_NAME) {
  process.env.DB_NAME = 'items_test';
}

if (!process.env.GATEWAY_SECRET) {
  process.env.GATEWAY_SECRET =
    'a2fecb45705b2cdc7a4ae447e39137b43d51e0451602024f0538cc14df30535b';
}
