import { model, Schema } from 'mongoose';

const auctionRequestSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'Heartisans_user',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  productDescription: {
    type: String,
    required: true
  },
  productImageUrl: {
    type: String,
    required: true
  },
  productMaterial: {
    type: String
  },
  productWeight: {
    type: String
  },
  productColor: {
    type: String
  },
  offlineVerificationDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Date Accepted', 'Live', 'Rejected'],
    default: 'Pending'
  },
  predictedBasePrice: {
    type: Number
  },
  predictedCeilingPrice: {
    type: Number
  },
  adminNotes: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const auctionRequestModel = model('Heartisans_auctionRequest', auctionRequestSchema);
