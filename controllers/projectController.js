const Project = require('../models/Project');
const Task = require('../models/Task');
const { successResponse, errorResponse } = require('../utils/apiResponse');

// ==========================================
// PROJECTS
// ==========================================
const getProjects = async (req, res, next) => {
  try {
    const projects = await Project.find()
      .populate('client', 'name company email')
      .populate('members', 'name email avatar')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Projects retrieved', projects);
  } catch (error) {
    next(error);
  }
};

const createProject = async (req, res, next) => {
  try {
    const { name, code, client, startDate, deadline, budget, members } = req.body;

    const count = await Project.countDocuments();
    const projectCode = code || `PRJ-${(count + 101).toString()}`;

    const project = await Project.create({
      name,
      code: projectCode,
      client: client || null,
      startDate: startDate || new Date(),
      deadline,
      budget: budget || 0,
      members: members || [req.user._id],
    });

    return successResponse(res, 'Project created successfully', project, 201);
  } catch (error) {
    next(error);
  }
};

// ==========================================
// TASKS
// ==========================================
const getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.query;
    const query = {};
    if (projectId) query.project = projectId;

    const tasks = await Task.find(query)
      .populate('project', 'name code')
      .populate('assignedTo', 'name email avatar')
      .populate('comments.user', 'name avatar')
      .sort({ createdAt: -1 });

    return successResponse(res, 'Tasks retrieved', tasks);
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { project, title, description, assignedTo, priority, dueDate } = req.body;

    const task = await Task.create({
      project,
      title,
      description,
      assignedTo: assignedTo || req.user._id,
      priority: priority || 'Medium',
      dueDate,
    });

    return successResponse(res, 'Task created successfully', task, 201);
  } catch (error) {
    next(error);
  }
};

const updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!task) return errorResponse(res, 'Task not found', [], 404);

    // Update project overall progress %
    const totalProjectTasks = await Task.countDocuments({ project: task.project });
    const completedTasks = await Task.countDocuments({ project: task.project, status: 'Completed' });
    const progress = totalProjectTasks > 0 ? Math.round((completedTasks / totalProjectTasks) * 100) : 0;

    await Project.findByIdAndUpdate(task.project, { progress });

    return successResponse(res, 'Task status updated', task);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  createProject,
  getTasks,
  createTask,
  updateTaskStatus,
};
