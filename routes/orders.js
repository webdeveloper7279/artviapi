import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import { protect, admin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Get all orders (Admin) or user's orders
router.get('/', protect, async (req, res) => {
  try {
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
    const query = isAdmin ? {} : { user: req.user._id };
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product')
      .sort({ createdAt: -1 });
    
    // Ensure all orders have properly serialized deliveryLocation
    const serializedOrders = orders.map(order => {
      const orderObj = order.toObject ? order.toObject() : order;
      return orderObj;
    });
    
    // Log location data for debugging
    console.log('[Backend] Returning orders:', {
      count: serializedOrders.length,
      ordersWithLocation: serializedOrders.filter(o => o.deliveryLocation?.lat && o.deliveryLocation?.lng).length,
      sampleLocation: serializedOrders[0]?.deliveryLocation,
      sampleOrderId: serializedOrders[0]?._id,
    });
    
    res.json(serializedOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's orders only
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('items.product');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order or is admin
    const isAdmin = req.user.role === 'admin' || req.user.isAdmin === true;
    if (order.user._id.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create order
router.post('/', protect, async (req, res) => {
  try {
    const {
      items,
      totalPrice,
      personalInfo,
      paymentMethod,
      deliveryAddress,
      deliveryLocation, // New format: { lat, lng }
    } = req.body;

    console.log('[Backend] Received order request:', {
      hasItems: !!items,
      hasDeliveryAddress: !!deliveryAddress,
      deliveryLocation: deliveryLocation,
      deliveryLocationType: typeof deliveryLocation,
    });

    // Validate required fields
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Order items are required' });
    }

    if (!deliveryAddress) {
      return res.status(400).json({ message: 'Delivery address is required' });
    }

    // Validate location coordinates
    if (!deliveryLocation || !deliveryLocation.lat || !deliveryLocation.lng) {
      console.error('[Backend] Missing delivery location:', deliveryLocation);
      return res.status(400).json({ message: 'Delivery location coordinates are required' });
    }

    // Validate coordinates are valid numbers
    const lat = parseFloat(deliveryLocation.lat);
    const lng = parseFloat(deliveryLocation.lng);
    
    console.log('[Backend] Parsed coordinates:', { lat, lng, original: deliveryLocation });
    
    if (isNaN(lat) || isNaN(lng)) {
      console.error('[Backend] Invalid coordinates:', { lat, lng });
      return res.status(400).json({ message: 'Invalid location coordinates' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('[Backend] Coordinates out of range:', { lat, lng });
      return res.status(400).json({ message: 'Location coordinates out of valid range' });
    }

    // Enrich order items with product name and image
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const product = await Product.findById(item.product);
        return {
          product: item.product,
          name: product ? product.title : 'Product',
          image: product ? product.image : '',
          quantity: item.quantity,
          price: item.price,
        };
      })
    );

    // Determine initial status and payment status
    let status = 'pending';
    let isPaid = false;
    let paidAt = null;

    if (paymentMethod === 'card') {
      // For card payments, wait for user to upload screenshot
      status = 'pending_payment';
      isPaid = false;
    } else if (paymentMethod === 'cash') {
      // Cash payments are pending until admin confirms
      status = 'pending';
      isPaid = false;
    }

    const orderDataToSave = {
      user: req.user._id,
      items: enrichedItems,
      totalPrice,
      personalInfo,
      paymentMethod,
      deliveryAddress,
      deliveryLocation: {
        lat,
        lng,
      },
      status,
      isPaid,
      paidAt,
    };

    console.log('[Backend] Saving order with location:', {
      deliveryLocation: orderDataToSave.deliveryLocation,
      orderId: 'new',
    });

    const order = await Order.create(orderDataToSave);

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    // Ensure deliveryLocation is properly serialized
    const orderResponse = populatedOrder.toObject ? populatedOrder.toObject() : populatedOrder;
    
    console.log('[Backend] Order created successfully:', {
      orderId: orderResponse._id,
      deliveryLocation: orderResponse.deliveryLocation,
      deliveryLocationType: typeof orderResponse.deliveryLocation,
      hasLocation: !!(orderResponse.deliveryLocation?.lat && orderResponse.deliveryLocation?.lng),
      lat: orderResponse.deliveryLocation?.lat,
      lng: orderResponse.deliveryLocation?.lng,
    });

    res.status(201).json(orderResponse);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Upload payment screenshot
router.post('/:id/payment-screenshot', protect, upload.single('screenshot'), async (req, res) => {
  try {
    console.log('[Payment Screenshot] Upload request received:', {
      orderId: req.params.id,
      hasFile: !!req.file,
      fileName: req.file?.filename,
      fileSize: req.file?.size,
      filePath: req.file?.path,
    });

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user owns the order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if payment method is card
    if (order.paymentMethod !== 'card') {
      return res.status(400).json({ message: 'Payment method is not card' });
    }

    if (!req.file) {
      console.error('[Payment Screenshot] No file received');
      return res.status(400).json({ message: 'Screenshot file is required' });
    }

    // Update order with screenshot
    const screenshotPath = `/uploads/${req.file.filename}`;
    order.paymentScreenshot = screenshotPath;
    order.status = 'payment_uploaded';
    await order.save();

    console.log('[Payment Screenshot] Screenshot saved successfully:', {
      orderId: order._id,
      screenshotPath: screenshotPath,
      fileLocation: req.file.path,
    });

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    res.json({
      message: 'Payment screenshot uploaded successfully. Waiting for admin confirmation.',
      order: populatedOrder,
      screenshotPath: screenshotPath,
    });
  } catch (error) {
    console.error('[Payment Screenshot] Error:', error);
    res.status(400).json({ message: error.message || 'Failed to upload screenshot' });
  }
});

// Confirm payment (Admin only)
router.post('/:id/confirm-payment', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'payment_uploaded') {
      return res.status(400).json({ message: 'Order payment screenshot not uploaded yet' });
    }

    if (!order.paymentScreenshot) {
      return res.status(400).json({ message: 'Payment screenshot not found' });
    }

    // Confirm payment
    order.isPaid = true;
    order.paidAt = new Date();
    order.status = 'payment_confirmed';
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    res.json({
      message: 'Payment confirmed successfully',
      order: populatedOrder,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Reject payment (Admin only)
router.post('/:id/reject-payment', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'payment_uploaded') {
      return res.status(400).json({ message: 'Order payment screenshot not uploaded yet' });
    }

    // Reject payment - reset to pending_payment
    order.status = 'pending_payment';
    order.paymentScreenshot = '';
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    res.json({
      message: 'Payment rejected. User needs to upload a new screenshot.',
      order: populatedOrder,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update order status (Admin only)
router.put('/:id/status', protect, admin, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('items.product')
      .populate('user', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Mark order as delivered (Admin only)
router.put('/:id/deliver', protect, admin, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status === 'delivered') {
      return res.status(400).json({ message: 'Order is already marked as delivered' });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('items.product')
      .populate('user', 'name email');

    res.json({
      message: 'Order marked as delivered',
      order: populatedOrder,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

export default router;
