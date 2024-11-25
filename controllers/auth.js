const express = require('express');
const jwt = require('jsonwebtoken'); // Import the user model
const {
  register,
  login,
  fetchUsers,
  updateUser,
  deleteUser,
} = require('../services/authService');

const router = express.Router();

// User registration route
router.post('/register', register);

// User login route
router.post('/login', login);

// Fetch users route
router.get('/users', fetchUsers);
router.patch('/users/:userId', updateUser); // Route to update user
router.delete('/users/:userId', deleteUser);

// Token verification middleware
const authMiddleware = (req, res, next) => {
  const token = req.header('x-auth-token');
  if (!token)
    return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.userId;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Protected route example
router.get('/protected', authMiddleware, (req, res) => {
  res.send('This is a protected route');
});

module.exports = router;
