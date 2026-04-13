const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { Grant, Fund, Expense, User, GrantAssignment, AuditLog } = require('../models');
const { getSummary } = require('../controllers/dashboardController');
const crypto = require('crypto');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('MongoDB Migration Verification', () => {
  let adminId, subrecipientId, grantId, fundId;

  it('should seed data successfully', async () => {
    // Create Admin
    adminId = crypto.randomUUID();
    const admin = await User.create({
      id: adminId,
      name: 'Admin',
      email: 'admin@test.com',
      password: 'password123',
      role: 'admin'
    });

    // Create Subrecipient
    subrecipientId = crypto.randomUUID();
    const sub = await User.create({
      id: subrecipientId,
      name: 'Sarah',
      email: 'sarah@test.com',
      password: 'password123',
      role: 'subrecipient'
    });

    // Create Grant
    grantId = crypto.randomUUID();
    const grant = await Grant.create({
      id: grantId,
      title: 'NSF AI Grant',
      agency: 'NSF',
      amount: 100000,
      startDate: new Date(),
      endDate: new Date(),
      purpose: 'Test Purpose',
      status: 'Active',
      createdBy: adminId
    });

    // Create Fund
    fundId = crypto.randomUUID();
    const fund = await Fund.create({
      id: fundId,
      grantId,
      category: 'equipment',
      allocatedAmount: 50000,
      spentAmount: 0
    });

    // Create Assignment
    await GrantAssignment.create({
      id: crypto.randomUUID(),
      grantId,
      userId: subrecipientId
    });

    expect(admin).toBeDefined();
    expect(grant).toBeDefined();
    expect(fund).toBeDefined();
  });

  it('should verify virtual populates in Grant model', async () => {
    const grant = await Grant.findOne({ id: grantId }).populate('funds');
    expect(grant.funds).toBeDefined();
    expect(grant.funds.length).toBe(1);
    expect(grant.funds[0].category).toBe('equipment');
  });

  it('should verify dashboard summaries for Admin', async () => {
    const req = {
      user: { id: adminId, role: 'admin' }
    };
    const res = {
      json: jest.fn().mockImplementation((data) => {
        expect(data.success).toBe(true);
        expect(data.data.overview.totalGrants).toBe(1);
        expect(data.data.overview.totalAllocated).toBe(50000);
      })
    };
    const next = jest.fn();

    await getSummary(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });

  it('should verify dashboard summaries for Subrecipient', async () => {
    const req = {
      user: { id: subrecipientId, role: 'subrecipient' }
    };
    const res = {
      json: jest.fn().mockImplementation((data) => {
        expect(data.success).toBe(true);
        expect(data.data.overview.totalGrants).toBe(1);
      })
    };
    const next = jest.fn();

    await getSummary(req, res, next);
    expect(res.json).toHaveBeenCalled();
  });
});
