const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.PG_DATABASE || 'sih_corridor_data',
  process.env.PG_USER || 'postgres',
  process.env.PG_PASSWORD || 'postgres',
  {
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

const testConnection = async () => {
  await sequelize.authenticate();
};

module.exports = { sequelize, testConnection };
