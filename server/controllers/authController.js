const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
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

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'User already exists with this email' });
      }

      const user = await User.create({ name, email, password, role, department, designation });
      const token = generateToken(user._id);

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

const DEMO_USERS = [
  {
    name: 'Admin User',
    email: 'admin@railways.gov.in',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    designation: 'Chief Operations Manager',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Rajesh Kumar (SSE/P.Way)',
    email: 'engineering@railways.gov.in',
    password: 'eng123',
    role: 'engineering',
    department: 'Engineering',
    designation: 'Senior Section Engineer (P.Way)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Suresh Sharma (SSE/TRD)',
    email: 'trd@railways.gov.in',
    password: 'trd123',
    role: 'trd',
    department: 'Traction Distribution',
    designation: 'Senior Section Engineer (TRD)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Amit Verma (SSE/Sig)',
    email: 'signal@railways.gov.in',
    password: 'sig123',
    role: 's_and_t',
    department: 'Signal & Telecom',
    designation: 'Senior Section Engineer (Signal)',
    zone: 'Northern Railway',
    division: 'Delhi'
  },
  {
    name: 'Control Office Viewer',
    email: 'control@railways.gov.in',
    password: 'control123',
    role: 'control_office',
    department: 'Control Office',
    designation: 'Section Controller',
    zone: 'Northern Railway',
    division: 'Delhi'
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

      // Find user in DB
      let user = null;
      try {
        user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      } catch (dbErr) {
        console.warn('DB query failed during login, checking demo accounts:', dbErr.message);
      }

      // If user not in DB, check demo accounts and auto-provision
      if (!user) {
        const demoUser = DEMO_USERS.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
        );

        if (demoUser) {
          try {
            user = await User.create({ ...demoUser, email: demoUser.email.toLowerCase() });
            console.log(`✅ Auto-provisioned demo user in DB: ${demoUser.email}`);
          } catch (createErr) {
            // If DB unavailable, create a temporary user object
            user = {
              _id: 'demo_' + Date.now(),
              name: demoUser.name,
              email: demoUser.email,
              role: demoUser.role,
              department: demoUser.department,
              designation: demoUser.designation,
              zone: demoUser.zone,
              division: demoUser.division,
              isActive: true,
              toJSON: function() { return { ...this }; }
            };
          }
        }
      }

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      // Check password if user has comparePassword method (from DB)
      if (typeof user.comparePassword === 'function') {
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
          return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
      }

      if (!user.isActive) {
        return res.status(403).json({ success: false, message: 'Account is deactivated' });
      }

      const token = generateToken(user._id || 'demo_user');

      // Audit log (fail-safe)
      try {
        await AuditLog.create({
          action: 'user_login',
          userId: user._id,
          userName: user.name,
          targetType: 'user',
          details: `User ${user.name} logged in`
        });
      } catch (auditErr) {
        // Ignore audit log error if DB is in fallback mode
      }

      res.json({
        success: true,
        data: {
          user: typeof user.toJSON === 'function' ? user.toJSON() : user,
          token
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
];

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
