require('dotenv').config();
const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 MediSync Backend Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`📡 Listening on http://localhost:${PORT}`);
    console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`🤖 AI Microservice Connector: ${process.env.AI_SERVICE_URL || 'http://localhost:8000'}`);
    console.log(`======================================================\n`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error(`[Unhandled Promise Rejection]: ${err.message}`);
    server.close(() => process.exit(1));
  });
});
