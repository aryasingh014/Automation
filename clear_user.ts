import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function clearUser() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/observability');
  const UserSchema = new mongoose.Schema({ email: String }, { strict: false });
  const User = mongoose.model('User', UserSchema);
  
  const result = await User.deleteOne({ email: '22it014@excelcolleges.com' });
  console.log('Deleted user:', result);
  
  process.exit(0);
}

clearUser();
