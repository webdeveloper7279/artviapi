import express from 'express';
import Favorite from '../models/Favorite.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Get user's favorites
router.get('/', protect, async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate('product')
      .sort({ createdAt: -1 });
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add to favorites
router.post('/:productId', protect, async (req, res) => {
  try {
    const favorite = await Favorite.create({
      user: req.user._id,
      product: req.params.productId,
    });

    const populatedFavorite = await Favorite.findById(favorite._id).populate('product');
    res.status(201).json(populatedFavorite);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Product already in favorites' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Remove from favorites
router.delete('/:productId', protect, async (req, res) => {
  try {
    const favorite = await Favorite.findOneAndDelete({
      user: req.user._id,
      product: req.params.productId,
    });

    if (!favorite) {
      return res.status(404).json({ message: 'Favorite not found' });
    }

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Check if product is favorite
router.get('/check/:productId', protect, async (req, res) => {
  try {
    const favorite = await Favorite.findOne({
      user: req.user._id,
      product: req.params.productId,
    });
    res.json({ isFavorite: !!favorite });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
