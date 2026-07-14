import HomeList from "../model/homeBannerSchema.js";
import topInDemandModel from "../model/topdemandModel.js";
import { uploadHomePageImage } from "../services/imageStorageService.js";
import ExploreDealAndRecomended from "../model/exploredeals&RecomendedModel.js";
import TrendingOffers from "../model/trending&LimitedOffersModel.js";
import mongoose from "mongoose";


/**
 * Create or Update Home Page Data
 */
export const saveHomeList = async (req, res) => {
  try {
    console.log("FILES =>", req.files);

    const rentalFiles = req.files?.rentalAssets || [];
    const popularFiles = req.files?.popularDeals || [];

    const isRentalUploaded = rentalFiles.length > 0;
    const isPopularUploaded = popularFiles.length > 0;

    if (!isRentalUploaded && !isPopularUploaded) {
      return res.status(400).json({
        success: false,
        message: "Please upload rentalAssets or popularDeals images",
      });
    }

    // Agar rentalAssets upload kiya hai, to exactly 3 images required
    if (isRentalUploaded && rentalFiles.length !== 3) {
      return res.status(400).json({
        success: false,
        message: `Rental Assets must have exactly 3 images. You uploaded ${rentalFiles.length}.`,
      });
    }

    // Agar popularDeals upload kiya hai, to exactly 3 images required
    if (isPopularUploaded && popularFiles.length !== 3) {
      return res.status(400).json({
        success: false,
        message: `Popular Deals must have exactly 3 images. You uploaded ${popularFiles.length}.`,
      });
    }

    let homeList = await HomeList.findOne();

    if (!homeList) {
      homeList = await HomeList.create({
        rentalAssets: [],
        popularDeals: [],
      });
    }

    // Only rentalAssets replace hoga, popularDeals old same rahega
    if (isRentalUploaded) {
      const uploadedRentalAssets = await Promise.all(
        rentalFiles.map(async (file) => {
          const uploaded = await uploadHomePageImage(file);
          return uploaded.url;
        })
      );

      homeList.rentalAssets = uploadedRentalAssets;
    }

    // Only popularDeals replace hoga, rentalAssets old same rahega
    if (isPopularUploaded) {
      const uploadedPopularDeals = await Promise.all(
        popularFiles.map(async (file) => {
          const uploaded = await uploadHomePageImage(file);
          return uploaded.url;
        })
      );

      homeList.popularDeals = uploadedPopularDeals;
    }

    await homeList.save();

    return res.status(200).json({
      success: true,
      message: "Home page data saved successfully",
      data: homeList,
    });
  } catch (error) {
    console.error("Save Home List Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


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
// export const saveTopInDemand = async (req, res) => {
//   try {
//     const { brand, model, price,serialNo,assetName, category } = req.body;
//     console.log("Request Body:", req.body);
//     const file = req.file;
//     if (!file) {
//       return res.status(400).json({
//         success: false,
//         message: "Image is required",
//       });
//     }

//     const uploadedImage = await uploadHomePageImage(file);

//     const data = await topInDemandModel.create({
//       brand,
//       model,
//       price,
//       serialNo,
//       assetName,
//       category,
//       image: uploadedImage.url,
//     });
//     // console.log("Top In Demand Created:", data);

//     return res.status(201).json({
//       success: true,
//       message: "Top In Demand created successfully",
//       data,
//     });
//   } catch (error) {
//     console.error(error);

//     return res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
export const saveTopInDemand = async (req, res) => {
  try {
    const {
      brand,
      model,
      price,
      serialNo,
      assetName,
      category,
      subCategory,
    } = req.body;

    console.log("Request Body:", req.body);

    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "Image is required",
      });
    }

    if ( !brand || !category || !price || !serialNo) {
      return res.status(400).json({
        success: false,
        message:
          "Brand, category, price and serial number are required",
      });
    }

    const uploadedImage = await uploadHomePageImage(file);

    const data = await topInDemandModel.create({
      assetName: assetName.trim(),
      brand: brand.trim(),
      model: model?.trim(),
      price: price.trim(),
      serialNo: Number(serialNo),
      category: category.trim(),
      subCategory: subCategory?.trim(),
      image: uploadedImage.url,
    });

    return res.status(201).json({
      success: true,
      message: "Top In Demand created successfully",
      data,
    });
  } catch (error) {
    console.error("SAVE TOP IN DEMAND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
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

export const deletetopInDemandById = async (req, res) =>{
  try{
    const id = req.params.id;
    if (!id){
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters.",
      });
    }
      if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid explore deal image id.",
      });
    }
    const data = await topInDemandModel.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Top In Demand deleted successfully",
      data,
    });
  }catch(error){
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}



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

export const deleteExploreDealImageById = async (req, res) =>{
  try {
    const { id } = req.params;
   if (!id){
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters.",
      });
    }
      if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid explore deal image id.",
      });
    }

    await ExploreDealAndRecomended.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Explore deal image deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting explore deal image:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}



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


export const deleteExploreDealById = async (req, res) =>{
  try {
    const { id } = req.params;
   if (!id){
      return res.status(400).json({
        success: false,
        message: "Invalid request parameters.",
      });
    }
      if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid explore deal id.",
      });
    }

    await ExploreDealAndRecomended.findByIdAndDelete(id);
    return res.status(200).json({
      success: true,
      message: "Explore deal image deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting explore deal image:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
}


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



export const deleteTrendingItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Trending item id is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid trending item id.",
      });
    }

    const deletedItem = await TrendingOffers.findOneAndDelete({
      _id: id,
      type: "Trending",
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Trending item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Trending item deleted successfully.",
      data: deletedItem,
    });
  } catch (error) {
    console.error("Delete Trending Item Error:", error);

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



export const deleteOfferItemById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Offer item id is required.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer item id.",
      });
    }

    const deletedItem = await TrendingOffers.findOneAndDelete({
      _id: id,
      type: "Offers",
    });

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Offer item not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Offer item deleted successfully.",
      data: deletedItem,
    });
  } catch (error) {
    console.error("Delete Offer Item Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
};