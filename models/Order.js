import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  price: {
    type: Number,
    required: true,
  },
});

const deliveryAddressSchema = new mongoose.Schema({
  region: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
  comment: {
    type: String,
    default: '',
  },
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalPrice: {
      type: Number,
      required: true,
    },
    personalInfo: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'cash'],
      required: true,
    },
    deliveryAddress: {
      type: deliveryAddressSchema,
      required: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: {
      type: Date,
    },
    deliveredAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ['pending', 'pending_payment', 'payment_uploaded', 'payment_confirmed', 'paid', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    paymentScreenshot: {
      type: String,
      default: '',
    },
    // Location coordinates for delivery
    deliveryLocation: {
      lat: {
        type: Number,
      },
      lng: {
        type: Number,
      },
    },
    // Keep backward compatibility for old string format
    deliveryLocationString: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Order', orderSchema);
