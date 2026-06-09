import HomeList from "../model/homeBannerSchema.js";
import topInDemandModel from "../model/topdemandModel.js";
import { uploadHomePageImage } from "../services/imageStorageService.js";
import ExploreDealAndRecomended from "../model/exploredeals&RecomendedModel.js";
import TrendingOffers from "../model/trending&LimitedOffersModel.js";


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


//top in demand images
export const saveTopInDemand = async (req, res) => {
  try {
    const { brand, model, price,serialNo } = req.body;
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    const uploadedImage = await uploadHomePageImage(file);

    const data = await topInDemandModel.create({
      brand,
      model,
      price,
      serialNo,
      image: uploadedImage.url,
    });

    return res.status(201).json({
      success: true,
      message: "Top In Demand created successfully",
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get All
export const getTopInDemand = async (req, res) => {
  try {
    const data = await topInDemandModel.find().sort({
      serialNo: 1,
    });

    return res.status(200).json({
      success: true,
      count: data.length,
      data,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



//explore deals and recomended



// Add Image Only
export const addExploreDealImageOnly = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    // Upload image to ImageKit
    const image = await uploadHomePageImage(req.file);

    const data = await ExploreDealAndRecomended.create({
      image,
    });

    return res.status(201).json({
      success: true,
      message: "Image added successfully.",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getExploreDealImages = async (req, res) => {
  try {
    const images= await ExploreDealAndRecomended.find({
      brand: { $exists: false, $ne: "" },
      category: { $exists: false, $ne: "" },
      model: { $exists: false, $ne: "" },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Explore deal images fetched successfully.",
      count: images.length,
      data: images,
    });
  } catch (error) {
    console.error("Error fetching explore deal images:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};



export const addExploreDealWithDetails = async (req, res) => {
  try {
    const { brand, category, model } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    // Upload image to ImageKit
    const image = await uploadHomePageImage(req.file);

    const data = await ExploreDealAndRecomended.create({
      image,
      brand,
      category,
      model,
    });

    return res.status(201).json({
      success: true,
      message: "Explore Deal added successfully.",
      data,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getExploreDeals = async (req, res) => {
  try {
    const deals = await ExploreDealAndRecomended.find({
      brand: { $exists: true, $ne: "" },
      category: { $exists: true, $ne: "" },
      model: { $exists: true, $ne: "" },
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Recommended deals fetched successfully.",
      count: deals.length,
      data: deals,
    });
  } catch (error) {
    console.error("Error fetching recommended deals:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};



//trending and limited offers controllers



export const addTrending = async (req, res) => {
  try {
    const { model, category, brand ,price,type} = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    // Upload image to ImageKit
    const uploadedImage = await uploadHomePageImage(req.file);

    const data = await TrendingOffers.create({
      image: uploadedImage,
      model,
      category,
      brand,
      type: "Trending",
      price, // or "0" since price is required in your schema
      discount: 0,
    });

    return res.status(201).json({
      success: true,
      message: "Trending item added successfully.",
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};



export const getTrendingItems = async (req, res) => {
  try {
    const data = await TrendingOffers.find({
      type: "Trending",
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "Trending items fetched successfully.",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};



//offer items

export const addOfferItem = async (req, res) => {
  try {
    const { category, price, discount } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Image is required.",
      });
    }

    const uploadedImage = await uploadHomePageImage(req.file);

    const data = await TrendingOffers.create({
      category,
      price,
      discount: discount || "0",
      brand: null,
      model: null,
      type: "Offers",
      image: {
        url: uploadedImage.url,
        fileId: uploadedImage.fileId,
        filename: uploadedImage.filename,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Offer item added successfully.",
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getOfferItems = async (req, res) => {
  try {
    const data = await TrendingOffers.find({
      type: "Offers",
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Offer items fetched successfully.",
      count: data.length,
      data,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};