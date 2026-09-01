const Asset = require('../models/Asset');
const Maintenance = require('../models/Maintenance');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ==========================================
// ASSETS
// ==========================================
const getAssets = async (req, res, next) => {
  try {
    const assets = await Asset.find()
      .populate('assignedEmployee', 'firstName lastName designation')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Assets list retrieved', assets);
  } catch (error) {
    next(error);
  }
};

const createAsset = async (req, res, next) => {
  try {
    const { name, category, purchaseDate, purchasePrice, currentValue, location, assignedEmployee } = req.body;

    const count = await Asset.countDocuments();
    const assetId = `AST-${(count + 1001).toString()}`;

    const asset = await Asset.create({
      assetId,
      name,
      category,
      purchaseDate: purchaseDate || new Date(),
      purchasePrice,
      currentValue: currentValue !== undefined ? currentValue : purchasePrice,
      location,
      assignedEmployee: assignedEmployee || null,
    });

    return successResponse(res, 'Asset registered successfully', asset, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// MAINTENANCE
// ==========================================
const getMaintenanceLogs = async (req, res, next) => {
  try {
    const logs = await Maintenance.find().populate('asset', 'name assetId category').sort({ createdAt: -1 });
    return successResponse(res, 'Maintenance logs retrieved', logs);
  } catch (error) {
    next(error);
  }
};

const createMaintenanceLog = async (req, res, next) => {
  try {
    const { assetId, title, description, maintenanceType, scheduledDate, cost, technician } = req.body;

    const count = await Maintenance.countDocuments();
    const maintenanceNumber = `MNT-${(count + 1001).toString()}`;

    const maintenance = await Maintenance.create({
      maintenanceNumber,
      asset: assetId,
      title,
      description,
      maintenanceType,
      scheduledDate,
      cost: cost || 0,
      technician: technician || 'Internal Maintenance',
    });

    return successResponse(res, 'Maintenance task scheduled', maintenance, 201);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAssets,
  createAsset,
  getMaintenanceLogs,
  createMaintenanceLog,
};
