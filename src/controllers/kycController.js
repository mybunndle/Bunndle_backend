// import {
//   generateDigilockerTokenService,
//   fetchDigilockerDetailsService,
// } from "../services/idsPayService.js";

// import AadhaarVerification
// from "../model/adharVerificationModel.js";

// import User from "../model/userModel.js";


// // =====================================
// // GENERATE TOKEN
// // =====================================

// export const generateDigilockerToken =
//   async (req, res) => {

//     try {

//       const aadhaar_number =
//         req.body?.aadhaar_number;

//       // =========================
//       // VALIDATION
//       // =========================

//       if (!aadhaar_number) {

//         return res.status(400).json({
//           success: false,
//           message:
//             "Aadhaar number is required",
//         });
//       }

//       // =========================
//       // CALL IDSPAY
//       // =========================

//       const data =
//         await generateDigilockerTokenService(
//           aadhaar_number
//         );

//       // =========================
//       // RESPONSE DATA
//       // =========================

//       const responseData =
//         data?.data;

//       // =========================
//       // MASK AADHAAR
//       // =========================

//       const maskedAadhaar =
//         `XXXX-XXXX-${aadhaar_number.slice(-4)}`;

//       // =========================
//       // SAVE IN DATABASE
//       // =========================

//       const savedVerification =
//         await AadhaarVerification.create({

//           userId: req.user?._id,

//           maskedAadhaar,

//           verificationId:
//             responseData?.client_id,

//           verified: false,

//           rawResponse: data,
//         });

//       // =========================
//       // RESPONSE
//       // =========================

//       return res.status(200).json({
//         success: true,

//         message:
//           "Digilocker token generated successfully",

//         data: {

//           verification:
//             savedVerification,

//           digilocker:
//             responseData,
//         },
//       });

//     } catch (error) {

//       console.log(
//         error.response?.data ||
//         error.message
//       );

//       return res.status(500).json({
//         success: false,

//         message:
//           "Verification failed",

//         error:
//           error.response?.data ||
//           error.message,
//       });
//     }
//   };



// // =====================================
// // FETCH DETAILS
// // =====================================

// export const fetchDigilockerDetails =
//   async (req, res) => {

//     try {

//       const { client_id } =
//         req.body;

//       if (!client_id) {

//         return res.status(400).json({
//           success: false,
//           message:
//             "client_id is required",
//         });
//       }

//       // =========================
//       // FETCH DETAILS FROM IDSPAY
//       // =========================

//       const data =
//         await fetchDigilockerDetailsService(
//           client_id
//         );

//       console.log(
//         "DIGILOCKER DETAILS:",
//         data
//       );

//       // =========================
//       // EXTRACT DATA
//       // =========================

//       const aadhaarData =
//         data?.data?.aadhaar_xml_data;

//       // =========================
//       // UPDATE VERIFICATION
//       // =========================

//       const updatedVerification =
//         await AadhaarVerification.findOneAndUpdate(
//           {
//             verificationId:
//               client_id,
//           },
//           {

//             fullName:
//               aadhaarData?.full_name,

//             gender:
//               aadhaarData?.gender,

//             dob:
//               aadhaarData?.dob,

//             state:
//               aadhaarData?.address?.state,

//             mobileLinked: true,

//             verified: true,

//             rawResponse: data,
//           },
//           {
//             new: true,
//           }
//         );

//       // =========================
//       // UPDATE USER
//       // =========================

//       if (
//         updatedVerification?.userId
//       ) {

//         await User.findByIdAndUpdate(
//           updatedVerification.userId,
//           {
//             kycStatus:
//               "VERIFIED",

//             isKycVerified:
//               true,

//             kycVerifiedAt:
//               new Date(),
//           }
//         );
//       }

//       // =========================
//       // RESPONSE
//       // =========================

//       return res.status(200).json({
//         success: true,
//         message:
//           "KYC verified successfully",
//         data:
//           updatedVerification,
//       });

//     } catch (error) {

//       console.log(
//         error.response?.data ||
//         error.message
//       );

//       return res.status(500).json({
//         success: false,
//         message:
//           "Failed to fetch details",
//         error:
//           error.response?.data ||
//           error.message,
//       });
//     }
//   };



// // =====================================
// // CALLBACK
// // =====================================

// export const digilockerCallback =
//   async (req, res) => {

//     try {

//       console.log(
//         "CALLBACK QUERY:",
//         req.query
//       );

//       const client_id =
//         req.query.client_id;

//       const status =
//         req.query.status;

//       // =========================
//       // VALIDATION
//       // =========================

//       if (!client_id) {

//         return res.status(400).json({
//           success: false,
//           message:
//             "client_id missing",
//         });
//       }

//       if (status !== "success") {

//         return res.status(400).json({
//           success: false,
//           message:
//             "Digilocker verification failed",
//         });
//       }

//       // =========================
//       // FETCH VERIFIED DETAILS
//       // =========================

//       const data =
//         await fetchDigilockerDetailsService(
//           client_id
//         );

//       console.log(
//         "FETCH DETAILS:",
//         data
//       );

//       // =========================
//       // EXTRACT DATA
//       // =========================

//       const aadhaarData =
//         data?.data?.aadhaar_xml_data;

//       // =========================
//       // UPDATE VERIFICATION
//       // =========================

//       const updatedVerification =
//         await AadhaarVerification.findOneAndUpdate(
//           {
//             verificationId:
//               client_id,
//           },
//           {

//             fullName:
//               aadhaarData?.full_name,

//             gender:
//               aadhaarData?.gender,

//             dob:
//               aadhaarData?.dob,

//             state:
//               aadhaarData?.address?.state,

//             mobileLinked: true,

//             verified: true,

//             rawResponse: data,
//           },
//           {
//             new: true,
//           }
//         );

//       // =========================
//       // UPDATE USER
//       // =========================

//       if (
//         updatedVerification?.userId
//       ) {

//         await User.findByIdAndUpdate(
//           updatedVerification.userId,
//           {
//             kycStatus:
//               "VERIFIED",

//             isKycVerified:
//               true,

//             kycVerifiedAt:
//               new Date(),
//           }
//         );
//       }

//       // =========================
//       // SUCCESS RESPONSE
//       // =========================

//       return res.status(200).json({
//         success: true,
//         message:
//           "Digilocker verification completed",
//         data:
//           updatedVerification,
//       });

//     } catch (error) {

//       console.log(error);

//       return res.status(500).json({
//         success: false,
//         error:
//           error.response?.data ||
//           error.message,
//       });
//     }
//   };










import {
  generateDigilockerTokenService,
  fetchDigilockerDetailsService,
} from "../services/idsPayService.js";

import AadhaarVerification
from "../model/adharVerificationModel.js";

import User from "../model/userModel.js";


// =====================================
// GENERATE TOKEN
// =====================================

export const generateDigilockerToken =
  async (req, res) => {

    try {

      const aadhaar_number =
        req.body?.aadhaar_number;

      // =========================
      // VALIDATION
      // =========================

      if (!aadhaar_number) {

        return res.status(400).json({
          success: false,
          message:
            "Aadhaar number is required",
        });
      }

      // =========================
      // CALL IDSPAY
      // =========================

      const data =
        await generateDigilockerTokenService(
          aadhaar_number
        );

      // =========================
      // RESPONSE DATA
      // =========================

      const responseData =
        data?.data;

      // =========================
      // MASK AADHAAR
      // =========================

      const maskedAadhaar =
        `XXXX-XXXX-${aadhaar_number.slice(-4)}`;

      // =========================
      // SAVE IN DATABASE
      // =========================

      const savedVerification =
        await AadhaarVerification.create({

          userId: req.user?._id,

          maskedAadhaar,

          verificationId:
            responseData?.client_id,

          verified: false,

          rawResponse: data,
        });

      // =========================
      // RESPONSE
      // =========================

      return res.status(200).json({
        success: true,

        message:
          "Digilocker token generated successfully",

        data: {

          verification:
            savedVerification,

          digilocker:
            responseData,
        },
      });

    } catch (error) {


      // =========================
      // EXTRACT ERROR MESSAGE
      // =========================

      const apiError =
        error.response?.data?.error?.error;

      const fieldMessage =
        apiError?.metadata?.fields?.[0]?.message;

      const finalMessage =
        fieldMessage ||
        apiError?.message ||
        error.response?.data?.message ||
        "Verification failed";

      return res.status(400).json({
        success: false,

        message: finalMessage,

        error:
          error.response?.data ||
          error.message,
      });
    }
  };



// =====================================
// FETCH DETAILS
// =====================================

export const fetchDigilockerDetails =
  async (req, res) => {

    try {

      const { client_id } =
        req.body;

      if (!client_id) {

        return res.status(400).json({
          success: false,
          message:
            "client_id is required",
        });
      }

      // =========================
      // FETCH DETAILS FROM IDSPAY
      // =========================

      const data =
        await fetchDigilockerDetailsService(
          client_id
        );

      
      // =========================
      // EXTRACT DATA
      // =========================

      const aadhaarData =
        data?.data?.aadhaar_xml_data;

      // =========================
      // UPDATE VERIFICATION
      // =========================

      const updatedVerification =
        await AadhaarVerification.findOneAndUpdate(
          {
            verificationId:
              client_id,
          },
          {

            fullName:
              aadhaarData?.full_name,

            gender:
              aadhaarData?.gender,

            dob:
              aadhaarData?.dob,

            state:
              aadhaarData?.address?.state,

            mobileLinked: true,

            verified: true,

            rawResponse: data,
          },
          {
            new: true,
          }
        );

      // =========================
      // UPDATE USER
      // =========================

      if (
        updatedVerification?.userId
      ) {

        await User.findByIdAndUpdate(
          updatedVerification.userId,
          {
            kycStatus:
              "VERIFIED",

            isKycVerified:
              true,

            kycVerifiedAt:
              new Date(),
          }
        );
      }

      // =========================
      // RESPONSE
      // =========================

      return res.status(200).json({
        success: true,
        message:
          "KYC verified successfully",
        data:
          updatedVerification,
      });

    } catch (error) {

     
      const apiError =
        error.response?.data?.error?.error;

      const fieldMessage =
        apiError?.metadata?.fields?.[0]?.message;

      const finalMessage =
        fieldMessage ||
        apiError?.message ||
        error.response?.data?.message ||
        "Failed to fetch details";

      return res.status(400).json({
        success: false,
        message: finalMessage,
        error:
          error.response?.data ||
          error.message,
      });
    }
  };


export const digilockerCallback =
  async (req, res) => {

    try {

     

      const client_id =
        req.query.client_id;

      const status =
        req.query.status;

      // =========================
      // VALIDATION
      // =========================

      if (!client_id) {

        return res.status(400).json({
          success: false,
          message:
            "client_id missing",
        });
      }

      if (status !== "success") {

        return res.status(400).json({
          success: false,
          message:
            "Digilocker verification failed",
        });
      }

      // =========================
      // FETCH VERIFIED DETAILS
      // =========================

      const data =
        await fetchDigilockerDetailsService(
          client_id
        );

      

      // =========================
      // EXTRACT DATA
      // =========================

      const aadhaarData =
        data?.data?.aadhaar_xml_data;

      // =========================
      // UPDATE VERIFICATION
      // =========================

      const updatedVerification =
        await AadhaarVerification.findOneAndUpdate(
          {
            verificationId:
              client_id,
          },
          {

            fullName:
              aadhaarData?.full_name,

            gender:
              aadhaarData?.gender,

            dob:
              aadhaarData?.dob,

            state:
              aadhaarData?.address?.state,

            mobileLinked: true,

            verified: true,

            rawResponse: data,
          },
          {
            new: true,
          }
        );

      // =========================
      // UPDATE USER
      // =========================

      if (
        updatedVerification?.userId
      ) {

        await User.findByIdAndUpdate(
          updatedVerification.userId,
          {
            kycStatus:
              "VERIFIED",

            isKycVerified:
              true,

            kycVerifiedAt:
              new Date(),
          }
        );
      }

      // =========================
      // SUCCESS RESPONSE
      // =========================

      return res.status(200).json({
        success: true,
        message:
          "Digilocker verification completed",
        data:
          updatedVerification,
      });

    } catch (error) {

     

      const apiError =
        error.response?.data?.error?.error;

      const fieldMessage =
        apiError?.metadata?.fields?.[0]?.message;

      const finalMessage =
        fieldMessage ||
        apiError?.message ||
        error.response?.data?.message ||
        "Digilocker callback failed";

      return res.status(400).json({
        success: false,
        message: finalMessage,
        error:
          error.response?.data ||
          error.message,
      });
    }
  };