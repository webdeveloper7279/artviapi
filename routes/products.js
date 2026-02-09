import express from 'express';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, limit } = req.query;
    const query = category ? { category } : {};
    let productsQuery = Product.find(query).populate('category').sort({ createdAt: -1 });
    
    // Limit results if specified
    if (limit) {
      productsQuery = productsQuery.limit(parseInt(limit));
    }
    
    const products = await productsQuery;
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
  try {
    const products = await Product.find({ category: req.params.categoryId })
      .populate('category')
      .sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create product (Admin only)
router.post('/', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const {
      title,
      titleUz,
      titleRu,
      description,
      descriptionUz,
      descriptionRu,
      price,
      category,
      categoryName,
    } = req.body;

    // Validate required multilingual fields
    if (!descriptionUz || descriptionUz.trim() === '') {
      return res.status(400).json({ message: 'Description (UZ) is required' });
    }
    if (!descriptionRu || descriptionRu.trim() === '') {
      return res.status(400).json({ message: 'Description (RU) is required' });
    }

    const image = req.file ? `/uploads/${req.file.filename}` : '';

    const product = await Product.create({
      title,
      titleUz,
      titleRu,
      description,
      descriptionUz: descriptionUz.trim(),
      descriptionRu: descriptionRu.trim(),
      price,
      image,
      category,
      categoryName,
    });

    const populatedProduct = await Product.findById(product._id).populate('category');
    res.status(201).json(populatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update product (Admin only)
router.put('/:id', protect, admin, upload.single('image'), async (req, res) => {
  try {
    const updateData = { ...req.body };

    // Validate multilingual fields if they are being updated
    if (updateData.descriptionUz !== undefined) {
      if (!updateData.descriptionUz || updateData.descriptionUz.trim() === '') {
        return res.status(400).json({ message: 'Description (UZ) is required' });
      }
      updateData.descriptionUz = updateData.descriptionUz.trim();
    }
    if (updateData.descriptionRu !== undefined) {
      if (!updateData.descriptionRu || updateData.descriptionRu.trim() === '') {
        return res.status(400).json({ message: 'Description (RU) is required' });
      }
      updateData.descriptionRu = updateData.descriptionRu.trim();
    }

    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete product (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
