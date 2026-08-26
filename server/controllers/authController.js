const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { JWT_SECRET, DEMO_USERS } = require('../middleware/auth');

// Generate JWT with user id, email, and role
const generateToken = (user) => {
  const payload = {
    id: (user._id || user.id || 'demo_user').toString(),
    email: user.email,
    role: user.role
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
};

// POST /api/auth/register
exports.register = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'engineering', 'trd', 's_and_t', 'control_office']).withMessage('Invalid role'),
  body('department').isIn(['Administration', 'Engineering', 'Traction Distribution', 'Signal & Telecom', 'Control Office']).withMessage('Invalid department'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { name, email, password, role, department, designation } = req.body;
      const cleanEmail = email.toLowerCase().trim();

      // Check if user exists
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const user = await User.create({ name, email: cleanEmail, password, role, department, designation });
      const token = generateToken(user);

      res.status(201).json({
        success: true,
        data: {
          user: user.toJSON(),
          token
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// POST /api/auth/login
exports.login = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const cleanEmail = (email || '').toLowerCase().trim();

      // 1. Check if matching demo user credentials
      const demoMatch = DEMO_USERS.find(
        (u) => u.email.toLowerCase() === cleanEmail && u.password === password
      );

      let user = null;

      // Try to find user in MongoDB
      try {
        user = await User.findOne({ email: cleanEmail }).select('+password');
      } catch (dbErr) {
        console.warn('DB query during login failed:', dbErr.message);
      }

      if (demoMatch) {
        // Fast-path for verified demo accounts
        if (!user) {
          try {
            user = await User.create({ ...demoMatch, email: cleanEmail });
          } catch (createErr) {
            user = { ...demoMatch };
          }
        }
      } else {
        // Regular user: verify against database password
        if (!user) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        if (typeof user.comparePassword === 'function') {
          const isMatch = await user.comparePassword(password);
          if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
          }
        } else if (user.password !== password) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      }

      if (user.isActive === false) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      const token = generateToken(user);

      // Audit log (fail-safe)
      try {
        await AuditLog.create({
          action: 'user_login',
          userId: user._id || 'demo_user',
          userName: user.name || cleanEmail,
          targetType: 'user',
          details: `User ${user.name || cleanEmail} logged in`
        });
      } catch (auditErr) {
        // Ignore audit error
      }

      const userData = typeof user.toJSON === 'function' ? user.toJSON() : { ...user };
      delete userData.password;

      res.json({
        success: true,
        data: {
          user: userData,
          token
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: error.message || 'Login failed' });
    }
  }
];

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    let user = req.user;
    if (user && typeof user.toJSON === 'function') {
      user = user.toJSON();
    }
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
