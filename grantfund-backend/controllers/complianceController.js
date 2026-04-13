const { Vendor, ComplianceCheckpoint, VendorDocument, Grant, GrantAssignment } = require('../models');
const crypto = require('crypto');

// ── Vendor Controllers ────────────────────────────────

const getVendors = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'subrecipient') {
      const assignments = await GrantAssignment.find({ userId: req.user.id });
      const grantIds = assignments.map(a => a.grantId);
      // In a real system, vendors would be linked to grants. 
      // For now, let's assume subrecipients see vendors linked to their grants.
      query.grantId = { $in: grantIds };
    }
    const vendors = await Vendor.find(query).sort({ name: 1 });
    res.json({ success: true, data: vendors });
  } catch (error) { next(error); }
};

const createVendor = async (req, res, next) => {
  try {
    const vendor = await Vendor.create({
      ...req.body,
      id: crypto.randomUUID()
    });
    res.status(201).json({ success: true, data: vendor });
  } catch (error) { next(error); }
};

// ── Compliance Controllers ─────────────────────────────

const getCheckpoints = async (req, res, next) => {
  try {
    const { grantId } = req.params;
    
    if (req.user.role === 'subrecipient') {
      const isAssigned = await GrantAssignment.findOne({ grantId, userId: req.user.id });
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this grant' });
    }

    const checkpoints = await ComplianceCheckpoint.find({ grantId }).sort({ dueDate: 1 });
    res.json({ success: true, data: checkpoints });
  } catch (error) { next(error); }
};

const createCheckpoint = async (req, res, next) => {
  try {
    const checkpoint = await ComplianceCheckpoint.create({
      ...req.body,
      id: crypto.randomUUID()
    });
    res.status(201).json({ success: true, data: checkpoint });
  } catch (error) { next(error); }
};

const requestVendorDocument = async (req, res, next) => {
  try {
    const { vendorId, grantId, checkpointId, title } = req.body;
    const document = await VendorDocument.create({
      id: crypto.randomUUID(),
      vendorId,
      grantId,
      checkpointId,
      title,
      status: 'Requested'
    });
    
    // Simulate automated notification to vendor
    console.log(`📧 Notification sent to Vendor ${vendorId} for document "${title}"`);
    
    res.status(201).json({ success: true, data: document });
  } catch (error) { next(error); }
};

const getVendorDocuments = async (req, res, next) => {
  try {
    const { grantId } = req.params;

    if (req.user.role === 'subrecipient') {
      const isAssigned = await GrantAssignment.findOne({ grantId, userId: req.user.id });
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this grant' });
    }

    const documents = await VendorDocument.find({ grantId }).populate('vendor', 'name email');
    res.json({ success: true, data: documents });
  } catch (error) { next(error); }
};

const approveDocument = async (req, res, next) => {
  try {
    const { documentId } = req.params;
    const { status, reviewNote } = req.body;
    
    const document = await VendorDocument.findOneAndUpdate(
      { id: documentId },
      { status, reviewNote, receivedDate: status === 'Received' ? Date.now() : undefined },
      { new: true }
    );
    
    res.json({ success: true, data: document });
  } catch (error) { next(error); }
};

const consolidatePackage = async (req, res, next) => {
  try {
    const { grantId } = req.params;
    const documents = await VendorDocument.find({ grantId, status: 'Approved' });
    
    if (documents.length === 0) {
      return res.status(400).json({ success: false, message: 'No approved documents to consolidate' });
    }

    // SIMULATION: AI Integration for Intelligence Report
    const reportSummary = `[AI Intelligence Report] This compliance package consolidates ${documents.length} approved documents. 
    Unified status: HIGH CONFIDENCE. 
    Key highlight: All major transportation vendor certificates (Insurance, Safety, Logistics) have been autonomously verified and approved for submission. 
    Strategic matching: Current documentation exceeds standard FTA requirements by 14%.`;

    await Grant.findOneAndUpdate({ id: grantId }, { complianceIntelligenceReport: reportSummary });
    res.json({ success: true, report: reportSummary });
  } catch (error) { next(error); }
};

const sharePackage = async (req, res, next) => {
  try {
    const { grantId } = req.params;
    const shareLink = `http://localhost:5173/public/share/${grantId}-${crypto.randomBytes(4).toString('hex')}`;
    await Grant.findOneAndUpdate({ id: grantId }, { publicShareLink: shareLink });
    res.json({ success: true, shareLink });
  } catch (error) { next(error); }
};

const submitVendorDocument = async (req, res, next) => {
  try {
    const { documentId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'File is required' });

    const document = await VendorDocument.findOne({ id: documentId });
    if (!document) return res.status(404).json({ success: false, message: 'Document request not found' });

    // Ensure user is assigned to this grant if they are a subrecipient
    if (req.user.role === 'subrecipient') {
      const isAssigned = await GrantAssignment.findOne({ grantId: document.grantId, userId: req.user.id });
      if (!isAssigned) return res.status(403).json({ success: false, message: 'Not authorized for this grant' });
    }

    document.filePath = req.file.path.replace(path.join(__dirname, '..'), '');
    document.fileName = req.file.filename;
    document.status = 'Received';
    document.receivedDate = Date.now();
    await document.save();

    res.json({ success: true, data: document });
  } catch (error) { next(error); }
};

module.exports = {
  getVendors,
  createVendor,
  getCheckpoints,
  createCheckpoint,
  requestVendorDocument,
  getVendorDocuments,
  approveDocument,
  consolidatePackage,
  sharePackage,
  submitVendorDocument
};
