const { Sequelize } = require('sequelize');

let sequelize;

if (process.env.DATABASE_URL || process.env.PG_URI) {
  const connectionUrl = process.env.DATABASE_URL || process.env.PG_URI;
  sequelize = new Sequelize(connectionUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: process.env.PG_SSL === 'false' ? false : {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  sequelize = new Sequelize(
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
}

const testConnection = async () => {
  await sequelize.authenticate();
};

module.exports = { sequelize, testConnection };
