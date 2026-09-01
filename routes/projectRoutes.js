const express = require('express');
const router = express.Router();
const {
  getProjects,
  createProject,
  getTasks,
  createTask,
  updateTaskStatus,
} = require('../controllers/projectController');

const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/projects')
  .get(getProjects)
  .post(createProject);

router.route('/tasks')
  .get(getTasks)
  .post(createTask);

router.put('/tasks/:id/status', updateTaskStatus);

module.exports = router;
