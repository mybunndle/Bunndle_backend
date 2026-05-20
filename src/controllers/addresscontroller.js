import addressModel from "../model/addressModel.js";
import axios from "axios";

// export const addAddress = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const {
//       name,
//       phone,
//       pinCode,
//       state,
//       city,
//       locality,
//       addressLine,
//       addressType,
//       customType,
//       isDefault,
//     } = req.body;

//     // If new address is default → unset previous default
//     if (isDefault) {
//       await addressModel.updateMany(
//         { userId, isDefault: true },
//         { $set: { isDefault: false } },
//       );
//     }

//     if (addressType === "Other" && !customType) {
//       return res.status(400).json({
//         success: false,
//         message: "Custom address type is required when type is Other",
//       });
//     }

//     const address = await addressModel.create({
//       userId,
//       name,
//       phone,
//       pinCode,
//       state,
//       city,
//       locality,
//       addressLine,
//       addressType,
//       customType: addressType === "Other" ? customType : null,
//       isDefault,
//     });

//     res.status(201).json({
//       success: true,
//       message: "Address added successfully",
//       address,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to add address",
//       error: error.message,
//     });
//   }
// };

// demo fileds by pincode postal api


export const addAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    let {
      name,
      phone,
      pinCode,
      state,
      city,
      locality,
      addressLine,
      addressType,
      customType,
      isDefault,
    } = req.body;

    // ✅ normalize (VERY IMPORTANT)
    addressType =
      addressType.charAt(0).toUpperCase() +
      addressType.slice(1).toLowerCase();

    // ✅ validate custom type
    if (addressType === "Other" && !customType) {
      return res.status(400).json({
        success: false,
        message: "Custom address type is required when type is Other",
      });
    }

    // 🔥 CHECK DUPLICATE (Home / Work / Office only)
    if (["Home", "Work", "Office"].includes(addressType)) {
      const existing = await addressModel.findOne({
        userId,
        addressType,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `${addressType} address already exists. Go and edit it.`,
        });
      }
    }

    // ✅ handle default
    if (isDefault) {
      await addressModel.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }

    // ✅ create address
    const address = await addressModel.create({
      userId,
      name,
      phone,
      pinCode,
      state,
      city,
      locality,
      addressLine,
      addressType,
      customType: addressType === "Other" ? customType : null,
      isDefault,
    });

    return res.status(201).json({
      success: true,
      message: "Address added successfully",
      address,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to add address",
      error: error.message,
    });
  }
};



export const updateAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    const address = await addressModel.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    if (req.body.isDefault) {
      await addressModel.updateMany(
        { userId, isDefault: true },
        { $set: { isDefault: false } },
      );
    }

    Object.assign(address, req.body);
    await address.save();

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update address",
      error: error.message,
    });
  }
};

export const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await addressModel.find({ userId }).sort({
      isDefault: -1,
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: "Addresses fetched successfully",
      count: addresses.length,
      addresses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch addresses",
      error: error.message,
    });
  }
};

export const deleteAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    const address = await addressModel.findOneAndDelete({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete address",
      error: error.message,
    });
  }
};


export const setDefaultAddress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { addressId } = req.params;

    // ✅ check if address exists and belongs to user
    const address = await addressModel.findOne({
      _id: addressId,
      userId,
    });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found",
      });
    }

    // ✅ remove previous default
    await addressModel.updateMany(
      { userId, isDefault: true },
      { $set: { isDefault: false } }
    );

    // ✅ set new default
    address.isDefault = true;
    await address.save();

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      address,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to update default address",
      error: error.message,
    });
  }
};



export const createAddressFromPincode = async (req,res)=>{

  try {

    const userId = req.user.id;

    const { pinCode } = req.body;

    // 1️⃣ VALIDATE
    if (!pinCode || pinCode.length !== 6) {

      return res.status(400).json({

        success: false,
        message: "Invalid pincode",

      });

    }

    // 2️⃣ CALL POSTAL API
    const apiRes = await axios.get(
      `https://api.postalpincode.in/pincode/${pinCode}`
    );

    const apiData = apiRes.data[0];

    if (
      apiData.Status !== "Success" ||
      !apiData.PostOffice?.length
    ) {

      return res.status(400).json({

        success: false,
        message: "Pincode not found",

      });

    }

    // 3️⃣ EXTRACT DATA
    const postOffice =
      apiData.PostOffice[0];

    // 4️⃣ ALWAYS CREATE NEW ADDRESS
    const address =
      await addressModel.create({

        userId,

        name: "Your Name",

        state: postOffice.State,

        city: postOffice.District,

        pinCode: postOffice.Pincode,


        addressType: "Other",

        customType: "Pincode",

      });

    return res.status(201).json({

      success: true,

      message:
        "Address created from pincode",

      address,

    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({

      success: false,

      message:
        "Failed to create address",

      error: error.message,

    });

  }

};