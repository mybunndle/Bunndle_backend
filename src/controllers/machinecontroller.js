

import VehicleModel from "../model/machinaryModel.js";
import { uploadVehicleLogo } from "../services/imageStorageService.js";

export const createVehicle = async (req, res) => {
  try {

    const { brand, category } = req.body;

    // ================= VALIDATION =================

    if (!brand) {
      return res.status(400).json({
        success: false,
        message: "Brand is required",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vehicle logo is required",
      });
    }

    // ================= DUPLICATE CHECK =================

    const existingVehicle = await VehicleModel.findOne({
      brand: brand.trim(),
    });

    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        message: "Vehicle brand already exists",
      });
    }

    // ================= IMAGEKIT UPLOAD =================

    const uploadedLogo = await uploadVehicleLogo(req.file);

    // ================= SAVE IN DATABASE =================

    const vehicle = await VehicleModel.create({
      brand: brand.trim(),
      category: category.trim(),

      logo: {
        url: uploadedLogo.url,
        fileId: uploadedLogo.fileId,
        filename: uploadedLogo.filename,
      },
    });

    // ================= RESPONSE =================

    res.status(201).json({
      success: true,
      message: "Vehicle brand added successfully",
      vehicle,
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message,
    });

  }
};


export const getVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "4-wheeler"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};