const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'sih-railopt-super-secret-key-2026-production';

const DEMO_USERS = [
  {
    _id: 'demo_admin',
    name: 'Admin User',
    email: 'admin@railways.gov.in',
    password: 'admin123',
    role: 'admin',
    department: 'Administration',
    designation: 'Chief Operations Manager',
    zone: 'Northern Railway',
    division: 'Delhi',
    isActive: true,
    toJSON: function() { return { ...this }; }
  },
  {
    _id: 'demo_engineering',
    name: 'Rajesh Kumar (SSE/P.Way)',
    email: 'engineering@railways.gov.in',
    password: 'eng123',
    role: 'engineering',
    department: 'Engineering',
    designation: 'Senior Section Engineer (P.Way)',
    zone: 'Northern Railway',
    division: 'Delhi',
    isActive: true,
    toJSON: function() { return { ...this }; }
  },
  {
    _id: 'demo_trd',
    name: 'Suresh Sharma (SSE/TRD)',
    email: 'trd@railways.gov.in',
    password: 'trd123',
    role: 'trd',
    department: 'Traction Distribution',
    designation: 'Senior Section Engineer (TRD)',
    zone: 'Northern Railway',
    division: 'Delhi',
    isActive: true,
    toJSON: function() { return { ...this }; }
  },
  {
    _id: 'demo_signal',
    name: 'Amit Verma (SSE/Sig)',
    email: 'signal@railways.gov.in',
    password: 'sig123',
    role: 's_and_t',
    department: 'Signal & Telecom',
    designation: 'Senior Section Engineer (Signal)',
    zone: 'Northern Railway',
    division: 'Delhi',
    isActive: true,
    toJSON: function() { return { ...this }; }
  },
  {
    _id: 'demo_control',
    name: 'Control Office Viewer',
    email: 'control@railways.gov.in',
    password: 'control123',
    role: 'control_office',
    department: 'Control Office',
    designation: 'Section Controller',
    zone: 'Northern Railway',
    division: 'Delhi',
    isActive: true,
    toJSON: function() { return { ...this }; }
  }
];

// Verify JWT token
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized - no token' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    let user = null;
    try {
      if (decoded.id && decoded.id.toString().length === 24 && /^[0-9a-fA-F]+$/.test(decoded.id.toString())) {
        user = await User.findById(decoded.id);
      } else if (decoded.email) {
        user = await User.findOne({ email: decoded.email.toLowerCase() });
      }
    } catch (dbErr) {
      console.warn('DB lookup in auth middleware failed:', dbErr.message);
    }

    // Fallback to demo users
    if (!user) {
      user = DEMO_USERS.find(
        (u) => u._id === decoded.id || 
               (decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase()) || 
               (decoded.role && u.role === decoded.role)
      );
    }

    // Final fail-safe: default to admin demo account
    if (!user) {
      user = DEMO_USERS[0];
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized - invalid token' });
  }
};

// Role-based access control
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Role '${req.user.role}' is not authorized to access this resource`
      });
    }
    next();
  };
};

// Department-based access
const requireDepartment = (...departments) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }
    if (['admin', 'control_office'].includes(req.user.role)) {
      return next();
    }
    if (!departments.includes(req.user.department)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this department data'
      });
    }
    next();
  };
};

module.exports = { protect, requireRole, requireDepartment, JWT_SECRET, DEMO_USERS };
