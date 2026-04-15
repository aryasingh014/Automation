import { AppRegistry, Incident } from './models/Telemetry.js';

const defaultApps = [
  { appId: 'APP-001', name: 'Customer Portal',    category: 'frontend',        environment: 'production', owner: 'Frontend Team',   status: 'active',   metadata: { tier: 'T1', baseHealth: 95 } },
  { appId: 'APP-002', name: 'Inventory API',       category: 'api',             environment: 'production', owner: 'Backend Team',    status: 'degraded', metadata: { tier: 'T1', baseHealth: 45 } },
  { appId: 'APP-003', name: 'Auth Service',        category: 'security',        environment: 'production', owner: 'Security Team',   status: 'active',   metadata: { tier: 'T1', baseHealth: 99 } },
  { appId: 'APP-004', name: 'Payment Gateway',     category: 'api',             environment: 'production', owner: 'Billing Team',    status: 'active',   metadata: { tier: 'T1', baseHealth: 82 } },
  { appId: 'APP-005', name: 'Reporting Engine',    category: 'backend',         environment: 'production', owner: 'Data Team',       status: 'active',   metadata: { tier: 'T2', baseHealth: 95 } },
  { appId: 'APP-006', name: 'Legacy CRM',          category: 'other',           environment: 'production', owner: 'Legacy Team',     status: 'degraded', metadata: { tier: 'T3', baseHealth: 70 } },
  { appId: 'APP-007', name: 'Mobile Backend',      category: 'backend',         environment: 'production', owner: 'Mobile Team',     status: 'active',   metadata: { tier: 'T1', baseHealth: 97 } },
  { appId: 'APP-008', name: 'Email Dispatcher',    category: 'middleware',      environment: 'production', owner: 'Comms Team',      status: 'active',   metadata: { tier: 'T2', baseHealth: 100 } },
  { appId: 'APP-009', name: 'Order Processing',    category: 'backend',         environment: 'production', owner: 'Commerce Team',   status: 'down',     metadata: { tier: 'T1', baseHealth: 38 } },
  { appId: 'APP-010', name: 'Warehouse Service',   category: 'backend',         environment: 'production', owner: 'Logistics Team',  status: 'degraded', metadata: { tier: 'T2', baseHealth: 52 } },
  { appId: 'APP-011', name: 'Notification Hub',    category: 'middleware',      environment: 'production', owner: 'Platform Team',   status: 'active',   metadata: { tier: 'T2', baseHealth: 88 } },
  { appId: 'APP-012', name: 'Analytics Pipeline',  category: 'backend',         environment: 'production', owner: 'Data Team',       status: 'active',   metadata: { tier: 'T2', baseHealth: 91 } },
];

const defaultIncidents = [
  { number: 'INC-2024-001', title: 'Latency spike in US-East-1',      severity: 'P1', status: 'In Progress', serviceName: 'Warehouse Service',  source: 'autonomous', rootCause: 'Database connection timeouts' },
  { number: 'INC-2024-002', title: 'Inventory sync failure',           severity: 'P2', status: 'Assigned',    serviceName: 'Inventory API',       source: 'manual',     rootCause: 'API version mismatch' },
  { number: 'INC-2024-003', title: 'Checkout error rate peak',         severity: 'P1', status: 'New',         serviceName: 'Order Processing',    source: 'autonomous', rootCause: 'Legacy service degradation' },
  { number: 'INC-2024-004', title: 'Memory exhaustion on node-04',     severity: 'P2', status: 'Resolved',    serviceName: 'Legacy CRM',          source: 'manual',     rootCause: 'Memory leak in v3.2.1' },
  { number: 'INC-2024-005', title: 'Payment timeout elevated',         severity: 'P3', status: 'In Progress', serviceName: 'Payment Gateway',     source: 'autonomous', rootCause: 'Third-party gateway slowdown' },
];

export async function seedDatabase() {
  try {
    // Upsert all 12 apps (update if exists, insert if not)
    for (const app of defaultApps) {
      await AppRegistry.findOneAndUpdate(
        { appId: app.appId },
        app,
        { upsert: true, new: true }
      );
    }
    console.log(`[Seed] Upserted ${defaultApps.length} apps into AppRegistry`);

    const incidentCount = await Incident.countDocuments();
    if (incidentCount === 0) {
      await Incident.insertMany(defaultIncidents);
      console.log(`[Seed] Seeded ${defaultIncidents.length} incidents`);
    }

    console.log('[Seed] Database initialization complete');
  } catch (error) {
    console.error('[Seed] Error seeding database:', error);
  }
}
