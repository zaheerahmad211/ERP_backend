const express = require('express');
const router = express.Router();
const { register, login, getMe, updateProfile, changePassword, uploadAvatar, avatarUploadMiddleware, forgotPassword, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.post('/profile/avatar', protect, avatarUploadMiddleware, uploadAvatar);
router.put('/change-password', protect, changePassword);

module.exports = router;
