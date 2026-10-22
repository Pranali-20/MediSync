const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pharmaflow';
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true,
    });
    console.log(`[MediSync MongoDB] Connected successfully to host: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error) {
    console.error(`[MediSync MongoDB Error]: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
