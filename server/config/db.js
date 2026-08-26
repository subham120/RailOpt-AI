const mongoose = require('mongoose');

const connectMongo = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/sih_block_planning';
  await mongoose.connect(uri);
};

module.exports = connectMongo;
