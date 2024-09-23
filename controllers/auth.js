const express = require('express');
const jwt = require('jsonwebtoken'); // Import the user model
const { register, login } = require('../services/authService');

const router = express.Router();
router.post('/register', register);

// User login route
router.post('/login', login);

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
