import AssetEnquiry from "../model/assetEnquiryModel.js";

export const toggleEnquiry = async (req, res) => {
  try {
    const { assetId } = req.params;

    const userId = req.user._id;
    //checking existing enquiry

    const existing = await AssetEnquiry.findOne({
      assetId,
      userId,
    });

    // remove the enquiry if it already exists
    if (existing) {
      await existing.deleteOne();

      return res.status(200).json({
        success: true,

        message: "Enquiry removed",
      });
    }
    //creating the enquiry if it doesn't exist

    const enquiry = await AssetEnquiry.create({
      assetId,

      userId,
    });

    return res.status(201).json({
      success: true,

      message: "Enquiry added",

      data: enquiry,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,

      message: error.message,
    });
  }
};

export const getMyEnquiredAssets = async (req, res) => {
  try {
    const userId = req.user._id;
    const enquiries = await AssetEnquiry.find({
      userId,
    })
      .populate("assetId")
      .sort({
        createdAt: -1,
      });

    const assets = enquiries.map((item) => item.assetId);

    return res.status(200).json({
      success: true,
      total: assets.length,
      data: assets,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllEnquiries =
  async (req, res) => {

    try {

      // =========================
      // PAGINATION
      // =========================

      const page =
        Number(req.query.page) || 1;

      const limit =
        Number(req.query.limit) || 10;

      const skip =
        (page - 1) * limit;

      // =========================
      // FETCH ENQUIRIES
      // =========================

      const enquiries =
        await AssetEnquiry.find()

          // user who enquired
          .populate(
            "userId",
            "name email phone"
          )

          // asset details
          .populate({
            path: "assetId",

            populate: {
              path: "userId",
              select:
                "name email phone",
            },
          })

          .sort({
            createdAt: -1,
          })

          .skip(skip)

          .limit(limit);

      // =========================
      // TOTAL COUNT
      // =========================

      const total =
        await AssetEnquiry.countDocuments();

      // =========================
      // RESPONSE
      // =========================

      return res.status(200).json({

        success: true,

        currentPage: page,

        totalPages:
          Math.ceil(total / limit),

        total,

        data: enquiries,
      });

    } catch (error) {

      console.log(error);

      return res.status(500).json({

        success: false,

        message:
          error.message,
      });
    }
  };