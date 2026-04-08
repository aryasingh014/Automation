require('dotenv').config();
const connectDB = require('./config/database');
const { Grant, GrantDeadline, GrantAssignment, Fund, Proposal, ComplianceCheckpoint } = require('./models');

const clearMockData = async () => {
  await connectDB();
  const mockGrants = await Grant.find({ agency: { $ne: 'TxDOT' } });
  const mockGrantIds = mockGrants.map(g => g.id);
  if (mockGrantIds.length > 0) {
    await Grant.deleteMany({ id: { $in: mockGrantIds } });
    await GrantDeadline.deleteMany({ grantId: { $in: mockGrantIds } });
    await GrantAssignment.deleteMany({ grantId: { $in: mockGrantIds } });
    await Fund.deleteMany({ grantId: { $in: mockGrantIds } });
    await Proposal.deleteMany({ grantId: { $in: mockGrantIds } });
    await ComplianceCheckpoint.deleteMany({ grantId: { $in: mockGrantIds } });
    console.log(`Deleted ${mockGrantIds.length} mock grants and their associations.`);
  } else {
    console.log('No mock grants found.');
  }

  // Also clear expenses for those funds if necessary, but Fund deletion handles mostly everything visually.
  process.exit(0);
};
clearMockData();
