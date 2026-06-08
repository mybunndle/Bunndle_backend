import HomeList from "../model/homeBannerSchema.js";
import { uploadHomePageImage } from "../services/imageStorageService.js";

/**
 * Create or Update Home Page Data
 */
export const saveHomeList = async (req, res) => {
  try {
    console.log(req.files);

    const rentalFiles = req.files?.rentalAssets || [];
    const popularFiles = req.files?.popularDeals || [];

    const rentalAssets = await Promise.all(
      rentalFiles.map(async (file) => {
        const uploaded = await uploadHomePageImage(file);
        return uploaded.url; // or return uploaded if you want the whole object
      })
    );

    const popularDeals = await Promise.all(
      popularFiles.map(async (file) => {
        const uploaded = await uploadHomePageImage(file);
        return uploaded.url;
      })
    );

    let homeList = await HomeList.findOne();

    if (homeList) {
      homeList.rentalAssets = rentalAssets;
      homeList.popularDeals = popularDeals;

      await homeList.save();
    } else {
      homeList = await HomeList.create({
        rentalAssets,
        popularDeals,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Home page data saved successfully",
      data: homeList,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get Home Page Data
 */
export const getHomeList = async (req, res) => {
  try {
    const homeList = await HomeList.findOne();

    return res.status(200).json({
      success: true,
      data: homeList,
    });
  } catch (error) {
    console.error("Get Home List Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};