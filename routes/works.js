import express from 'express';
import Work from '../models/Work.js';
import { protect, admin } from '../middleware/auth.js';
import uploadWork from '../middleware/uploadWork.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Get all works
router.get('/', async (req, res) => {
  try {
    const works = await Work.find().sort({ createdAt: -1 });
    res.json(works);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single work
router.get('/:id', async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ message: 'Work not found' });
    }
    res.json(work);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create work (Admin only)
router.post('/', protect, admin, (req, res, next) => {
  uploadWork.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 50MB.' });
      }
      if (err.message) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: 'File upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const {
      title,
      descriptionUz,
      descriptionRu,
      descriptionEn,
      category,
      videoUrl,
      featured,
    } = req.body;

    // Validate required fields
    if (!descriptionUz || descriptionUz.trim() === '') {
      return res.status(400).json({ message: 'Description (UZ) is required' });
    }
    if (!descriptionRu || descriptionRu.trim() === '') {
      return res.status(400).json({ message: 'Description (RU) is required' });
    }
    if (!descriptionEn || descriptionEn.trim() === '') {
      return res.status(400).json({ message: 'Description (EN) is required' });
    }

    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];

    const workData = {
      title: title || 'Untitled Work',
      descriptionUz: descriptionUz.trim(),
      descriptionRu: descriptionRu.trim(),
      descriptionEn: descriptionEn.trim(),
      category: category || 'General',
      featured: featured === 'true' || featured === true,
    };

    if (imageFile) {
      workData.image = `/uploads/${imageFile.filename}`;
    }

    if (videoFile) {
      workData.video = `/uploads/${videoFile.filename}`;
    } else if (videoUrl && videoUrl.trim() !== '') {
      // Support YouTube/Vimeo links
      workData.videoUrl = videoUrl.trim();
    }

    // At least one media type is required
    if (!workData.image && !workData.video && !workData.videoUrl) {
      return res.status(400).json({ message: 'At least one media (image, video, or videoUrl) is required' });
    }

    const work = await Work.create(workData);
    res.status(201).json(work);
  } catch (error) {
    console.error('Error creating work:', error);
    // Return more detailed error message
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${errors}` });
    }
    res.status(400).json({ 
      message: error.message || 'Failed to create work',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Update work (Admin only)
router.put('/:id', protect, admin, (req, res, next) => {
  uploadWork.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ])(req, res, (err) => {
    if (err) {
      console.error('Multer error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File size too large. Maximum size is 50MB.' });
      }
      if (err.message) {
        return res.status(400).json({ message: err.message });
      }
      return res.status(400).json({ message: 'File upload failed.' });
    }
    next();
  });
}, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ message: 'Work not found' });
    }

    const {
      title,
      descriptionUz,
      descriptionRu,
      descriptionEn,
      category,
      videoUrl,
      featured,
    } = req.body;

    const updateData = {};

    if (title !== undefined) updateData.title = title;
    if (descriptionUz !== undefined) {
      if (!descriptionUz || descriptionUz.trim() === '') {
        return res.status(400).json({ message: 'Description (UZ) is required' });
      }
      updateData.descriptionUz = descriptionUz.trim();
    }
    if (descriptionRu !== undefined) {
      if (!descriptionRu || descriptionRu.trim() === '') {
        return res.status(400).json({ message: 'Description (RU) is required' });
      }
      updateData.descriptionRu = descriptionRu.trim();
    }
    if (descriptionEn !== undefined) {
      if (!descriptionEn || descriptionEn.trim() === '') {
        return res.status(400).json({ message: 'Description (EN) is required' });
      }
      updateData.descriptionEn = descriptionEn.trim();
    }
    if (category !== undefined) updateData.category = category;
    if (featured !== undefined) {
      updateData.featured = featured === 'true' || featured === true;
    }

    const imageFile = req.files?.image?.[0];
    const videoFile = req.files?.video?.[0];

    if (imageFile) {
      // Delete old image if exists
      if (work.image) {
        const oldImagePath = path.join(__dirname, '..', work.image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      updateData.image = `/uploads/${imageFile.filename}`;
    }

    if (videoFile) {
      // Delete old video if exists
      if (work.video) {
        const oldVideoPath = path.join(__dirname, '..', work.video);
        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }
      updateData.video = `/uploads/${videoFile.filename}`;
      updateData.videoUrl = undefined; // Clear videoUrl if uploading file
    } else if (videoUrl !== undefined) {
      // Delete old video file if switching to URL
      if (work.video) {
        const oldVideoPath = path.join(__dirname, '..', work.video);
        if (fs.existsSync(oldVideoPath)) {
          fs.unlinkSync(oldVideoPath);
        }
      }
      updateData.video = undefined;
      updateData.videoUrl = videoUrl.trim() || undefined;
    }

    const updatedWork = await Work.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedWork) {
      return res.status(404).json({ message: 'Work not found' });
    }

    res.json(updatedWork);
  } catch (error) {
    console.error('Error updating work:', error);
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message).join(', ');
      return res.status(400).json({ message: `Validation error: ${errors}` });
    }
    res.status(400).json({ 
      message: error.message || 'Failed to update work',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Delete work (Admin only)
router.delete('/:id', protect, admin, async (req, res) => {
  try {
    const work = await Work.findById(req.params.id);
    if (!work) {
      return res.status(404).json({ message: 'Work not found' });
    }

    // Delete associated files
    if (work.image) {
      const imagePath = path.join(__dirname, '..', work.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    if (work.video) {
      const videoPath = path.join(__dirname, '..', work.video);
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath);
      }
    }

    await Work.findByIdAndDelete(req.params.id);
    res.json({ message: 'Work deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
