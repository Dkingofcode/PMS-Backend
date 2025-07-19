// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const crypto = require("crypto");


// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// const protect = async (req, res, next) => {
//   let token = req.headers.authorization?.split(' ')[1];
//   if (!token) return res.status(401).json({ error: 'Not authorized, no token' });

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = await User.findById(decoded.id).select('-password');
//     next();
//   } catch (err) {
//     res.status(401).json({ error: 'Token failed' });
//   }
// };

// JWT token verification middleware
const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. No token provided.' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if user exists and is active
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ 
        success: false, 
        message: 'User no longer exists or is inactive.' 
      });
    }
    
    // Check if user is locked
    if (user.isLocked) {
      return res.status(423).json({ 
        success: false, 
        message: 'Account is temporarily locked due to failed login attempts.' 
      });
    }
    
    // Check if password was changed after token was issued
    const passwordChangedAt = user.lastPasswordChange.getTime() / 1000;
    if (decoded.iat < passwordChangedAt) {
      return res.status(401).json({ 
        success: false, 
        message: 'Password recently changed. Please log in again.' 
      });
    }
    
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Authentication error.' 
    });
  }
};


// const authorize = (...roles) => {
//   return (req, res, next) => {
//     if (!roles.includes(req.user.role))
//       return res.status(403).json({ error: 'Access denied' });
//     next();
//   };
// };


// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Authentication required.' 
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Insufficient privileges.' 
      });
    }
    
    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Access denied. Authentication required.' 
      });
    }
    
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Required permission not found.' 
      });
    }
    
    next();
  };
};

// Audit logging middleware
const auditLog = (action) => {
  return async (req, res, next) => {
    const auditData = {
      userId: req.user ? req.user._id : null,
      userRole: req.user ? req.user.role : null,
      action: action,
      resource: req.originalUrl,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    };
    
    // In production, store this in a dedicated audit collection
    console.log('AUDIT LOG:', auditData);
    
    next();
  };
};

// Session management utilities
const sessionManager = {
  generateSessionId: () => crypto.randomBytes(32).toString('hex'),
  
  addSession: async (userId, deviceInfo, ipAddress) => {
    const sessionId = sessionManager.generateSessionId();
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
    
    await User.findByIdAndUpdate(userId, {
      $push: {
        activeSessions: {
          sessionId,
          deviceInfo,
          ipAddress,
          createdAt: new Date(),
          lastAccessed: new Date(),
          expiresAt
        }
      }
    });
    
    return sessionId;
  },
  
  removeSession: async (userId, sessionId) => {
    await User.findByIdAndUpdate(userId, {
      $pull: { activeSessions: { sessionId } }
    });
  }
};



//const { addSession, removeSession } = sessionManager();

module.exports = { protect, authorize, authLimiter, sessionManager, requirePermission, }
module.exports = auditLog;

