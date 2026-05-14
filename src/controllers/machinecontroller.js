

// import VehicleModel from "../model/machinaryModel.js";
// import { uploadVehicleLogo } from "../services/imageStorageService.js";

// export const createVehicle = async (req, res) => {
//   try {

//     const { brand, category } = req.body;

//     // ================= VALIDATION =================

//     if (!brand) {
//       return res.status(400).json({
//         success: false,
//         message: "Brand is required",
//       });
//     }

//     if (!category) {
//       return res.status(400).json({
//         success: false,
//         message: "Category is required",
//       });
//     }

//     if (!req.file) {
//       return res.status(400).json({
//         success: false,
//         message: "Vehicle logo is required",
//       });
//     }

//     // ================= DUPLICATE CHECK =================

//     // const existingVehicle = await VehicleModel.findOne({
//     //   brand: brand.trim(),
//     // });

//     // if (existingVehicle) {
//     //   return res.status(400).json({
//     //     success: false,
//     //     message: "Vehicle brand already exists",
//     //   });
//     // }

//     // ================= IMAGEKIT UPLOAD =================

//     const uploadedLogo = await uploadVehicleLogo(req.file);

//     // ================= SAVE IN DATABASE =================

//     const vehicle = await VehicleModel.create({
//       brand: brand.trim(),
//       category: category.trim(),

//       logo: {
//         url: uploadedLogo.url,
//         fileId: uploadedLogo.fileId,
//         filename: uploadedLogo.filename,
//       },
//     });

//     // ================= RESPONSE =================

//     res.status(201).json({
//       success: true,
//       message: "Vehicle brand added successfully",
//       vehicle,
//     });

//   } catch (error) {

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });

//   }
// };


// export const getFourWheelerVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "4-wheeler"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getTwoWheelerVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "2-wheeler"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getHeavyMachineryVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "heavy-machinery"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getConstructionVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getCrainesAndliftingVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getConcreteAndRoadMachineryVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getWarehouseEquipmentVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


// export const getMiningVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getAgriculturalVehicles = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getPowerEquipments = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getIndustrialTools = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };
// export const getTrucksAndTrailers = async (req, res) => {
//   try {
//     const vehicles = await VehicleModel.find({category: "Construction Equipment"});
//     res.status(200).json({
//       success: true,
//       message: "Vehicles retrieved successfully",
//       count: vehicles.length,
//       vehicles,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };


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

    // const existingVehicle = await VehicleModel.findOne({
    //   brand: brand.trim(),
    // });

    // if (existingVehicle) {
    //   return res.status(400).json({
    //     success: false,
    //     message: "Vehicle brand already exists",
    //   });
    // }

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


export const getFourWheelerVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "4-wheeler"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getTwoWheelerVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "2-wheeler"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getHeavyMachineryVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "heavy-machinery"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getConstructionVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "construction-equipment"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getCrainesAndliftingVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "cranes-and-lifting"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getConcreteAndRoadMachinaries = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "concrete-and-road-machinery"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getWarehouseEquipments = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "warehouse-equipment"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


export const getMiningVehicles = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "mining-machine"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getAgriculturalMachines= async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "agricultural-machine"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getPowerEquipments = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "power-equipment"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getIndustrialTools = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "industrial-tools"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getTrucksAndTrailers = async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "trucks-and-trailers"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getmedicalEquipments= async (req, res) => {
  try {
    const vehicles = await VehicleModel.find({category: "medical-equipment"});
    res.status(200).json({
      success: true,
      message: "Vehicles retrieved successfully",
      count: vehicles.length,
      vehicles,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

