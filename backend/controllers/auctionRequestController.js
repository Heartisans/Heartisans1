import { auctionRequestModel } from '../models/auctionRequestModel.js';
import { auctionModel } from '../models/auctionModel.js';

export const createRequest = async (req, res) => {
  try {
    const request = await auctionRequestModel.create(req.body);
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: "Failed to create auction request" });
  }
};

export const getAllRequests = async (req, res) => {
  try {
    const requests = await auctionRequestModel.find().sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch auction requests" });
  }
};

export const getUserRequests = async (req, res) => {
  try {
    const { userId } = req.params;
    const requests = await auctionRequestModel.find({ userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user auction requests" });
  }
};

export const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes, predictedBasePrice, predictedCeilingPrice } = req.body;
    
    const updateData = { status };
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (predictedBasePrice !== undefined) updateData.predictedBasePrice = predictedBasePrice;
    if (predictedCeilingPrice !== undefined) updateData.predictedCeilingPrice = predictedCeilingPrice;

    const request = await auctionRequestModel.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    if (!request) return res.status(404).json({ error: "Auction request not found" });
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: "Failed to update auction request status" });
  }
};

export const publishAuction = async (req, res) => {
  try {
    const { id } = req.params;
    const { predictedBasePrice, predictedCeilingPrice, duration, startTime } = req.body;

    const request = await auctionRequestModel.findById(id);
    if (!request) return res.status(404).json({ error: "Auction request not found" });

    // Update request with prices and status
    request.predictedBasePrice = predictedBasePrice;
    request.predictedCeilingPrice = predictedCeilingPrice;
    request.status = 'Live';
    await request.save();

    // Create the actual live auction
    const newAuction = await auctionModel.create({
      productName: request.productName,
      productDescription: request.productDescription,
      productImageUrl: request.productImageUrl,
      productMaterial: request.productMaterial,
      productWeight: request.productWeight,
      productColor: request.productColor,
      sellerId: request.userId,
      sellerName: request.userName,
      basePrice: predictedBasePrice,
      startTime: startTime,
      duration: duration
    });

    res.status(201).json({ request, liveAuction: newAuction });
  } catch (err) {
    res.status(500).json({ error: "Failed to publish live auction" });
  }
};
