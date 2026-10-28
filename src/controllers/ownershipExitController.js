import mongoose from "mongoose";

import OwnershipExitRequest from "../model/ownershipExitRequestModel.js";
import PurchaseHistory from "../model/purchaseHistoryModel.js";
import Ownership from "../model/ownerShipModel.js";

const isValidId = (id) => mongoose.isValidObjectId(id);

const getUserId = (req) => req.user?._id || req.user?.id;

const sendError = (res, status, message) =>
  res.status(status).json({
    success: false,
    message,
  });

export const requestOwnershipExit = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isValidId(userId)) {
      return sendError(res, 401, "Unauthorized user");
    }

    const {
      purchaseHistoryId,
      requestedFractions,
      reason = "",
    } = req.body || {};

    if (!isValidId(purchaseHistoryId)) {
      return sendError(res, 400, "Valid purchaseHistoryId is required");
    }

    const fractions = Number(requestedFractions);

    if (
      requestedFractions === null ||
      requestedFractions === undefined ||
      typeof requestedFractions === "boolean" ||
      typeof requestedFractions === "object" ||
      (typeof requestedFractions === "string" &&
        !/^[0-9]+$/.test(requestedFractions.trim())) ||
      !Number.isSafeInteger(fractions) ||
      fractions < 1
    ) {
      return sendError(
        res,
        400,
        "requestedFractions must be a positive integer",
      );
    }

    if (typeof reason !== "string" || reason.length > 1000) {
      return sendError(res, 400, "Invalid exit reason");
    }

    const purchase = await PurchaseHistory.findOne({
      _id: purchaseHistoryId,
      userId,
      paymentStatus: "SUCCESS",
    }).lean();

    if (!purchase) {
      return sendError(res, 404, "Eligible purchase not found");
    }

    const purchasedFractions = Number(purchase.fractionsPurchased);

    if (!Number.isSafeInteger(purchasedFractions) || purchasedFractions < 1) {
      return sendError(res, 400, "Purchase has no eligible fractions");
    }

    if (fractions > purchasedFractions) {
      return sendError(
        res,
        400,
        "Requested fractions exceed purchased fractions",
      );
    }

    const ownership = await Ownership.findOne({
      userId,
      assetId: purchase.assetId,
    }).lean();

    if (!ownership) {
      return sendError(res, 404, "Ownership record not found");
    }

    const existingRequest = await OwnershipExitRequest.findOne({
      purchaseHistoryId,
      status: "PENDING",
    }).lean();

    if (existingRequest) {
      return sendError(res, 409, "An exit request is already pending");
    }

    const createdRequest = await OwnershipExitRequest.create({
      userId,
      ownershipId: ownership._id,
      purchaseHistoryId: purchase._id,
      assetId: purchase.assetId,
      requestedFractions: fractions,
      reason: reason.trim(),
      status: "PENDING",
    });

    return res.status(201).json({
      success: true,
      message: "Exit request submitted successfully",
      data: createdRequest,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return sendError(res, 409, "An exit request is already pending");
    }

    console.error("REQUEST OWNERSHIP EXIT ERROR:", error);

    return sendError(res, 500, "Unable to submit exit request");
  }
};

export const getMyOwnershipExitRequests = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!isValidId(userId)) {
      return sendError(res, 401, "Unauthorized user");
    }

    const requests = await OwnershipExitRequest.find({
      userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests,
    });
  } catch (error) {
    console.error("GET MY EXIT REQUESTS ERROR:", error);

    return sendError(res, 500, "Unable to fetch exit requests");
  }
};

export const getAllOwnershipExitRequests = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 20),
    );

    const allowedStatuses = ["PENDING", "APPROVED", "REJECTED"];

    const status = req.query.status;

    if (status !== undefined && !allowedStatuses.includes(status)) {
      return sendError(res, 400, "Invalid exit request status");
    }

    const filter = status ? { status } : {};

    const [requests, total] = await Promise.all([
      OwnershipExitRequest.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),

      OwnershipExitRequest.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      count: requests.length,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      data: requests,
    });
  } catch (error) {
    console.error("GET ALL EXIT REQUESTS ERROR:", error);

    return sendError(res, 500, "Unable to fetch exit requests");
  }
};

export const reviewOwnershipExitRequest = async (req, res) => {
  try {
    const adminId = getUserId(req);

    if (!isValidId(adminId)) {
      return sendError(res, 401, "Unauthorized admin");
    }

    const { requestId } = req.params;
    const { status, adminRemark = "" } = req.body || {};

    if (!isValidId(requestId)) {
      return sendError(res, 400, "Invalid exit request ID");
    }

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return sendError(res, 400, "Status must be APPROVED or REJECTED");
    }

    if (typeof adminRemark !== "string" || adminRemark.length > 1000) {
      return sendError(res, 400, "Invalid admin remark");
    }

    const updatedRequest = await OwnershipExitRequest.findOneAndUpdate(
      {
        _id: requestId,
        status: "PENDING",
      },
      {
        $set: {
          status,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          adminRemark: adminRemark.trim(),
        },
      },
      {
        new: true,
        runValidators: true,
      },
    );

    if (!updatedRequest) {
      return sendError(res, 409, "Request not found or already reviewed");
    }

    return res.status(200).json({
      success: true,
      message:
        status === "APPROVED"
          ? "Exit request approved successfully"
          : "Exit request rejected successfully",
      data: updatedRequest,
    });
  } catch (error) {
    console.error("REVIEW EXIT REQUEST ERROR:", error);

    return sendError(res, 500, "Unable to review exit request");
  }
};
