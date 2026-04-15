import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function findUser() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/observability-os');
  const UserSchema = new mongoose.Schema({ email: String }, { strict: false });
  const User = mongoose.model('User', UserSchema);
  
  const user = await User.findOne({ email: '22it014@excelcolleges.com' });
  console.log('Found user:', user);
  
  process.exit(0);
}

findUser();
