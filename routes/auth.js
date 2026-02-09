import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// JWT token generator
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin || user.role === 'admin',
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Password tekshirish - hash qilinmagan password'larni ham qo'llab-quvvatlash
    let isPasswordValid = false;
    
    // Password hash qilingan yoki qilinmaganini tekshirish
    // Hash qilingan password odatda $2a$, $2b$, yoki $2y$ bilan boshlanadi
    const isHashed = user.password.startsWith('$2a$') || 
                     user.password.startsWith('$2b$') || 
                     user.password.startsWith('$2y$');
    
    if (isHashed) {
      // Hash qilingan password - bcrypt tekshirish
      try {
        isPasswordValid = await user.matchPassword(password);
      } catch (error) {
        console.error('Password comparison error:', error);
        isPasswordValid = false;
      }
    } else {
      // Hash qilinmagan password - oddiy solishtirish
      if (user.password === password) {
        // Password to'g'ri, endi uni hash qilamiz va yangilaymiz
        try {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(password, salt);
          await user.save();
          isPasswordValid = true;
        } catch (error) {
          console.error('Error hashing password:', error);
          // Agar hash qilishda xatolik bo'lsa ham, password to'g'ri bo'lgani uchun ruxsat beramiz
          isPasswordValid = true;
        }
      } else {
        isPasswordValid = false;
      }
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // User ma'lumotlarini yangilash (agar password hash qilingan bo'lsa)
    // Bu isAdmin va role maydonlarining to'g'ri ekanligini ta'minlaydi
    const updatedUser = await User.findById(user._id).select('-password');
    
    if (!updatedUser) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role || 'user',
        isAdmin: updatedUser.isAdmin === true || updatedUser.role === 'admin',
      },
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged in user
 * @access  Private
 */
router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    isAdmin: req.user.isAdmin || req.user.role === 'admin',
  });
});

export default router;
