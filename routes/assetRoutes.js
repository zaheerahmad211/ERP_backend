const express = require('express');
const router = express.Router();
const {
  getAssets,
  createAsset,
  getMaintenanceLogs,
  createMaintenanceLog,
} = require('../controllers/assetController');

const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/assets')
  .get(getAssets)
  .post(createAsset);

router.route('/maintenance')
  .get(getMaintenanceLogs)
  .post(createMaintenanceLog);

module.exports = router;
