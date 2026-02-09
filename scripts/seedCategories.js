import mongoose from 'mongoose';
import Category from '../models/Category.js';
import dotenv from 'dotenv';

dotenv.config();

const categories = [
  {
    name: 'Home',
    nameUz: 'Bosh sahifa',
    nameRu: 'Главная',
    slug: 'home',
  },
  {
    name: 'Fashion illustration',
    nameUz: 'Fashion illustration',
    nameRu: 'Fashion иллюстрация',
    slug: 'fashion-illustration',
  },
  {
    name: 'Amaliy san\'at',
    nameUz: 'Amaliy san\'at',
    nameRu: 'Прикладное искусство',
    slug: 'amaliy-sanat',
  },
  {
    name: 'Grafika',
    nameUz: 'Grafika',
    nameRu: 'Графика',
    slug: 'grafika',
  },
  {
    name: 'Haykaltaroshlik',
    nameUz: 'Haykaltaroshlik',
    nameRu: 'Скульптура',
    slug: 'haykaltaroshlik',
  },
  {
    name: 'Temirchilik',
    nameUz: 'Temirchilik',
    nameRu: 'Кузнечное дело',
    slug: 'temirchilik',
  },
  {
    name: 'Kulolchilik',
    nameUz: 'Kulolchilik',
    nameRu: 'Гончарное дело',
    slug: 'kulolchilik',
  },
  {
    name: 'Zardo\'zlik va kashtachilik',
    nameUz: 'Zardo\'zlik va kashtachilik',
    nameRu: 'Золотое шитье и вышивка',
    slug: 'zardozlik',
  },
  {
    name: 'Yog\'och o\'ymakorligi',
    nameUz: 'Yog\'och o\'ymakorligi',
    nameRu: 'Резьба по дереву',
    slug: 'yogoch-oymakorligi',
  },
];

async function seedCategories() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log('MongoDB connected');

    // Clear existing categories (optional)
    await Category.deleteMany({});
    console.log('Cleared existing categories');

    // Insert categories
    await Category.insertMany(categories);
    console.log('Categories seeded successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding categories:', error);
    process.exit(1);
  }
}

seedCategories();
