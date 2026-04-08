const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config();

async function startMockServer() {
  try {
    console.log('🚀 Starting In-Memory MongoDB...');
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    // Override DATABASE_URL
    process.env.DATABASE_URL = uri;
    console.log(`✅ In-Memory MongoDB started at: ${uri}`);

    await mongoose.connect(uri);
    console.log('🔗 Connected to In-Memory MongoDB');

    // Require the models and seeding logic
    const { User, Grant, Fund, GrantAssignment } = require('./models');
    
    // Basic seed data
    console.log('🌱 Seeding in-memory database...');
    const adminId = crypto.randomUUID();
    await User.create({
      id: adminId,
      name: 'Admin User',
      email: 'admin@grantfund.com',
      password: 'admin123',
      role: 'admin'
    });

    const grantId = crypto.randomUUID();
    await Grant.create({
      id: grantId,
      title: 'TxDOT Infrastructure Grant 2026',
      agency: 'TxDOT',
      amount: 5000000,
      startDate: new Date(),
      endDate: new Date(Date.now() + 31536000000), // 1 year
      purpose: 'Major highway expansion and maintenance project.',
      status: 'Active',
      createdBy: adminId
    });

    await Fund.create({
      id: crypto.randomUUID(),
      grantId: grantId,
      category: 'equipment',
      allocatedAmount: 4000000,
      spentAmount: 500000
    });

    console.log('✅ Seeding complete!');

    // Start the Express server
    require('./server');

    console.log('💡 TIP: Use admin@grantfund.com / admin123 to log in.');
  } catch (error) {
    console.error('❌ Failed to start mock server:', error);
    process.exit(1);
  }
}

startMockServer();
