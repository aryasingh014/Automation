import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function activateUser() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/observability');
  const UserSchema = new mongoose.Schema({ email: String, status: String, isActive: Boolean, role: String }, { strict: false });
  const User = mongoose.model('User', UserSchema);
  
  const user = await User.findOneAndUpdate(
    { email: '22it014@excelcolleges.com' },
    { status: 'approved', isActive: true, role: 'admin' },
    { new: true }
  );
  console.log('Activated user:', user);
  
  process.exit(0);
}

activateUser();
