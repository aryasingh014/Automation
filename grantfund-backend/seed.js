// ============================================
// Seed Script — Populate database with sample data
// Run: npm run seed (from /server directory)
// ============================================

require('dotenv').config();
const connectDB = require('./config/database');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { User, Grant, GrantDeadline, GrantAssignment, Fund, Expense, Notification, AuditLog, Proposal } = require('./models');

const seedData = async () => {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await mongoose.connection.dropDatabase();
    console.log('🗑️  Cleared existing database');

    // ── Create Users ──────────────────────────────────
    const usersData = [
      {
        id: crypto.randomUUID(),
        name: 'Admin User',
        email: 'admin@grantfund.com',
        password: 'admin123',
        role: 'admin'
      },
      {
        id: crypto.randomUUID(),
        name: 'Sarah Johnson',
        email: 'sarah@university.edu',
        password: 'user123',
        role: 'subrecipient'
      },
      {
        id: crypto.randomUUID(),
        name: 'Michael Chen',
        email: 'michael@research.org',
        password: 'user123',
        role: 'subrecipient'
      }
    ];

    const users = await Promise.all(usersData.map(u => User.create(u)));
    console.log('👤 Users created');

    const admin = users[0];
    const sarah = users[1];
    const michael = users[2];

    // ── Create Grants ─────────────────────────────────
    const grantsData = [
      {
        id: crypto.randomUUID(),
        title: 'National Science Foundation - AI Research',
        agency: 'NSF',
        amount: 500000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2027-12-31'),
        purpose: 'Research in artificial intelligence and machine learning for healthcare applications',
        status: 'Active',
        createdBy: admin.id
      },
      {
        id: crypto.randomUUID(),
        title: 'Department of Energy - Clean Energy Initiative',
        agency: 'DOE',
        amount: 750000,
        startDate: new Date('2025-03-01'),
        endDate: new Date('2028-02-28'),
        purpose: 'Developing renewable energy solutions for rural communities',
        status: 'Active',
        createdBy: admin.id
      },
      {
        id: crypto.randomUUID(),
        title: 'NIH - Public Health Study',
        agency: 'NIH',
        amount: 300000,
        startDate: new Date('2025-06-01'),
        endDate: new Date('2027-05-31'),
        purpose: 'Epidemiological study on emerging infectious diseases in urban areas',
        status: 'Active',
        createdBy: admin.id
      },
      {
        id: crypto.randomUUID(),
        title: 'USDA - Agricultural Innovation',
        agency: 'USDA',
        amount: 200000,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2025-12-31'),
        purpose: 'Precision agriculture techniques for sustainable farming',
        status: 'Completed',
        createdBy: admin.id
      }
    ];

    const grants = await Promise.all(grantsData.map(g => Grant.create(g)));
    console.log('📋 Grants created');

    // ── Create Grant Deadlines ────────────────────────
    await GrantDeadline.insertMany([
      { id: crypto.randomUUID(), grantId: grants[0].id, title: 'Mid-term Report', date: new Date('2026-06-30'), completed: false },
      { id: crypto.randomUUID(), grantId: grants[0].id, title: 'Annual Review', date: new Date('2026-12-31'), completed: false },
      { id: crypto.randomUUID(), grantId: grants[1].id, title: 'Quarterly Report Q2', date: new Date('2026-06-30'), completed: false },
      { id: crypto.randomUUID(), grantId: grants[1].id, title: 'Field Study Results', date: new Date('2026-09-30'), completed: false },
      { id: crypto.randomUUID(), grantId: grants[2].id, title: 'Data Collection Phase 1', date: new Date('2026-05-31'), completed: false }
    ]);
    console.log('📅 Grant deadlines created');

    // ── Create Funds ──────────────────────────────────
    const fundsData = [
      // NSF Grant Funds
      { id: crypto.randomUUID(), grantId: grants[0].id, category: 'salary', allocatedAmount: 200000, spentAmount: 85000 },
      { id: crypto.randomUUID(), grantId: grants[0].id, category: 'equipment', allocatedAmount: 150000, spentAmount: 45000 },
      { id: crypto.randomUUID(), grantId: grants[0].id, category: 'travel', allocatedAmount: 50000, spentAmount: 12000 },
      { id: crypto.randomUUID(), grantId: grants[0].id, category: 'supplies', allocatedAmount: 80000, spentAmount: 30000 },
      // DOE Grant Funds
      { id: crypto.randomUUID(), grantId: grants[1].id, category: 'salary', allocatedAmount: 300000, spentAmount: 120000 },
      { id: crypto.randomUUID(), grantId: grants[1].id, category: 'equipment', allocatedAmount: 250000, spentAmount: 95000 },
      { id: crypto.randomUUID(), grantId: grants[1].id, category: 'travel', allocatedAmount: 100000, spentAmount: 35000 },
      { id: crypto.randomUUID(), grantId: grants[1].id, category: 'supplies', allocatedAmount: 80000, spentAmount: 25000 },
      // NIH Grant Funds
      { id: crypto.randomUUID(), grantId: grants[2].id, category: 'salary', allocatedAmount: 150000, spentAmount: 50000 },
      { id: crypto.randomUUID(), grantId: grants[2].id, category: 'equipment', allocatedAmount: 50000, spentAmount: 15000 },
      { id: crypto.randomUUID(), grantId: grants[2].id, category: 'travel', allocatedAmount: 60000, spentAmount: 20000 },
      { id: crypto.randomUUID(), grantId: grants[2].id, category: 'supplies', allocatedAmount: 30000, spentAmount: 10000 }
    ];
    const funds = await Promise.all(fundsData.map(f => Fund.create(f)));
    console.log('💰 Funds created');

    // ── Create Expenses ───────────────────────────────
    const expensesData = [
      {
        id: crypto.randomUUID(),
        grantId: grants[0].id,
        fundId: funds[0].id,
        submittedBy: sarah.id,
        description: 'Research Assistant Salary - March 2026',
        amount: 5000,
        status: 'Approved',
        reviewedBy: admin.id,
        reviewNote: 'Approved per employment contract',
        reviewedAt: new Date('2026-03-15')
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[0].id,
        fundId: funds[1].id,
        submittedBy: sarah.id,
        description: 'GPU Server for ML Training',
        amount: 15000,
        status: 'Approved',
        reviewedBy: admin.id,
        reviewNote: 'Essential for project objectives',
        reviewedAt: new Date('2026-03-10')
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[0].id,
        fundId: funds[2].id,
        submittedBy: michael.id,
        description: 'Conference Travel - AI Summit 2026',
        amount: 3500,
        status: 'Pending'
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[1].id,
        fundId: funds[4].id,
        submittedBy: michael.id,
        description: 'Field Research Team Compensation',
        amount: 8000,
        status: 'Pending'
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[1].id,
        fundId: funds[5].id,
        submittedBy: sarah.id,
        description: 'Solar Panel Testing Equipment',
        amount: 25000,
        status: 'Approved',
        reviewedBy: admin.id,
        reviewNote: 'Approved for Phase 2 testing',
        reviewedAt: new Date('2026-03-20')
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[2].id,
        fundId: funds[8].id,
        submittedBy: michael.id,
        description: 'Lab Technician Monthly Pay',
        amount: 4500,
        status: 'Rejected',
        reviewedBy: admin.id,
        reviewNote: 'Duplicate submission — already processed',
        reviewedAt: new Date('2026-03-18')
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[2].id,
        fundId: funds[10].id,
        submittedBy: sarah.id,
        description: 'Sample Collection Trip - Downtown Area',
        amount: 1200,
        status: 'Pending'
      }
    ];
    const expenses = await Promise.all(expensesData.map(e => Expense.create(e)));
    console.log('📝 Expenses created');

    // ── Create Notifications ──────────────────────────
    await Notification.insertMany([
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        message: 'New expense of $3,500 submitted by Michael Chen for AI Summit travel',
        type: 'info',
        read: false
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        message: 'New expense of $8,000 submitted by Michael Chen for field research',
        type: 'info',
        read: false
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        message: 'New expense of $1,200 submitted by Sarah Johnson for sample collection',
        type: 'info',
        read: true
      },
      {
        id: crypto.randomUUID(),
        userId: sarah.id,
        message: 'Your expense of $5,000 has been approved',
        type: 'success',
        read: true
      },
      {
        id: crypto.randomUUID(),
        userId: sarah.id,
        message: 'Your expense of $15,000 for GPU Server has been approved',
        type: 'success',
        read: false
      },
      {
        id: crypto.randomUUID(),
        userId: michael.id,
        message: 'Your expense of $4,500 has been rejected: Duplicate submission',
        type: 'error',
        read: false
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        message: '⚠️ Fund "equipment" for DOE grant is at 38% usage',
        type: 'warning',
        read: false
      }
    ]);
    console.log('🔔 Notifications created');

    // ── Create Audit Logs ─────────────────────────────
    await AuditLog.insertMany([
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: 'CREATE_GRANT',
        entity: 'Grant',
        entityId: grants[0].id,
        details: 'NSF AI Research grant created'
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: 'CREATE_GRANT',
        entity: 'Grant',
        entityId: grants[1].id,
        details: 'DOE Clean Energy grant created'
      },
      {
        id: crypto.randomUUID(),
        userId: sarah.id,
        action: 'SUBMIT_EXPENSE',
        entity: 'Expense',
        entityId: expenses[0].id,
        details: 'Expense of $5,000 submitted for salary'
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: 'APPROVE_EXPENSE',
        entity: 'Expense',
        entityId: expenses[0].id,
        details: 'Expense approved'
      },
      {
        id: crypto.randomUUID(),
        userId: admin.id,
        action: 'REJECT_EXPENSE',
        entity: 'Expense',
        entityId: expenses[5].id,
        details: 'Duplicate submission rejected'
      }
    ]);
    console.log('📜 Audit logs created');

    // 9. Create Historical Proposals (Use Case 2 Context)
    const historicalProposals = [
      {
        id: crypto.randomUUID(),
        grantId: grants[0].id, // NSF grant
        userId: admin.id,
        title: 'Successful AI Infrastructure Proposal 2025',
        content: { introduction: 'Leveraging state-of-the-art LLMs for urban mobility...', budget: '$250k' },
        status: 'Approved',
        isHistorical: true,
        outcomeNotes: 'Focus on community impact was the deciding factor.'
      },
      {
        id: crypto.randomUUID(),
        grantId: grants[1].id, // DOE grant
        userId: admin.id,
        title: 'Clean Energy Grid Expansion 2024',
        content: { introduction: 'Modernizing the Texas power grid for renewable integration...', budget: '$500k' },
        status: 'Approved',
        isHistorical: true,
        outcomeNotes: 'Technical feasibility and risk mitigation were highly praised.'
      }
    ];
    await Proposal.insertMany(historicalProposals);

    console.log('\n✅ Database seeded successfully!');
    console.log('─────────────────────────────────');
    console.log('Admin Login:');
    console.log('  Email: admin@grantfund.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Subrecipient Logins:');
    console.log('  Email: sarah@university.edu');
    console.log('  Password: user123');
    console.log('');
    console.log('  Email: michael@research.org');
    console.log('  Password: user123');
    console.log('─────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
};

seedData();
