const mongoose = require('mongoose');
console.log("MONGODB_URI:", process.env.MONGODB_URI);
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Error MongoDB:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
