const { Vendor, ComplianceCheckpoint, VendorDocument } = require('../models');
const crypto = require('crypto');

// ── Vendor Controllers ────────────────────────────────

const getVendors = async (req, res, next) => {
  try {
    const vendors = await Vendor.find().sort({ name: 1 });
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

module.exports = {
  getVendors,
  createVendor,
  getCheckpoints,
  createCheckpoint,
  requestVendorDocument,
  getVendorDocuments,
  approveDocument
};
