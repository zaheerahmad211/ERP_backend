const express = require('express');
const router = express.Router();
const { getUsers, getUserById, createUser, updateUser, deleteUser, getRoles } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.use(protect);

router.get('/roles', getRoles);

router.route('/')
  .get(authorize('Super Admin', 'Admin', 'HR Manager'), getUsers)
  .post(authorize('Super Admin', 'Admin'), createUser);

router.route('/:id')
  .get(getUserById)
  .put(authorize('Super Admin', 'Admin'), updateUser)
  .delete(authorize('Super Admin', 'Admin'), deleteUser);

module.exports = router;
