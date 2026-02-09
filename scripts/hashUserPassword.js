import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

dotenv.config();

const hashUserPassword = async () => {
  try {
    // MongoDB ga ulanish
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected ✅');

    // Email bo'yicha user topish
    const email = 'webdeveloper0997279@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log('❌ User topilmadi!');
      process.exit(1);
    }

    console.log('User topildi:', user.email);

    // Password hash qilinmagan bo'lsa (oddiy text bo'lsa)
    const passwordToHash = 'n20050103';
    
    // Password'ni hash qilish
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToHash, salt);

    // Password'ni yangilash (isModified trigger qilish uchun)
    user.password = hashedPassword;
    await user.save();

    console.log('✅ Password muvaffaqiyatli hash qilindi!');
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('isAdmin:', user.isAdmin);

    process.exit(0);
  } catch (error) {
    console.error('❌ Xatolik:', error.message);
    process.exit(1);
  }
};

hashUserPassword();
