import mongoose from 'mongoose';

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/observability';
  try {
    const conn = await mongoose.connect(uri);
    console.log(`[DB] MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error: any) {
    console.error(`[DB] MongoDB connection failed: ${error.message}`);
    // Don't throw — server runs in limited mode without DB
  }
};

export default connectDB;
