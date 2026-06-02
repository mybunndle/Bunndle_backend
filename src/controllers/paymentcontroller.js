import crypto from "crypto";
import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import Asset from "../model/coAssetModel.js";
import razorpay from "../config/razorpay.js";
import { allocateFractions } from "../services/ownerShipService.js";

export const createOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    const { assetId, fractions } = req.body;

    if (!assetId || !fractions) {
      return res.status(400).json({
        success: false,
        message: "assetId and fractions are required",
      });
    }

    const asset = await Asset.findById(assetId);

    if (!asset) {
      return res.status(404).json({
        success: false,
        message: "Asset not found",
      });
    }

    if (fractions <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid fraction count",
      });
    }

    if (asset.availableFractions < fractions) {
      return res.status(400).json({
        success: false,
        message: "Not enough fractions available",
      });
    }

    const amount = fractions * asset.amountPerFraction;

    // Create Order
    const order = await Order.create({
      userId,

      assetId,

      fractions,

      amountPerFraction: asset.amountPerFraction,

      totalAmount: amount,

      status: "PENDING_PAYMENT",
    });

    // Razorpay Order
    const razorpayOrder = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `receipt_${order._id}`,
    });

    // Payment Record
    await Payment.create({
      userId,

      orderId: order._id,

      razorpayOrderId: razorpayOrder.id,

      amount,

      status: "PENDING",
    });

    return res.status(200).json({
      success: true,
      order,
      razorpayOrder,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    // Update Payment
    const payment = await Payment.findOneAndUpdate(
      {
        razorpayOrderId: razorpay_order_id,
      },
      {
        razorpayPaymentId: razorpay_payment_id,

        razorpaySignature: razorpay_signature,

        status: "SUCCESS",
      },
      {
        new: true,
      },
    );

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment record not found",
      });
    }

    // Get Order
    const order = await Order.findById(payment.orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Duplicate Protection
    if (order.status === "COMPLETED") {
      return res.status(400).json({
        success: false,
        message: "Order already processed",
      });
    }

    // Allocate Fractions
    await allocateFractions({
      assetId: order.assetId,

      userId: order.userId,

      fractions: order.fractions,

      razorpayOrderId: razorpay_order_id,

      razorpayPaymentId: razorpay_payment_id,
    });

    // Mark Order Complete
    order.status = "COMPLETED";

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Payment verified and fractions allocated successfully",
      orderId: order._id,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(req.body)
      .digest("hex");

    const receivedSignature = req.headers["x-razorpay-signature"];

    if (generatedSignature !== receivedSignature) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const eventData = JSON.parse(req.body.toString());

    const event = eventData.event;

    if (event === "payment.captured") {
      const paymentEntity = eventData.payload.payment.entity;

      await Payment.findOneAndUpdate(
        {
          razorpayPaymentId: paymentEntity.id,
        },
        {
          webhookVerified: true,

          status: "SUCCESS",
        },
      );
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
    });
  }
};

// import crypto from "crypto";
// import Order from "../model/OrderModel.js";
// import Payment from "../model/PaymentModel.js";
// import razorpay from "../config/razorpay.js";
// import { allocateFractions } from "../services/ownerShipService.js";

// export  const createOrder = async (req,res)=>{

//    try{

//       const userId = req.user.id;

//       const { amount } = req.body;

//       // STEP 1 → Save Order In MongoDB
//       const order = await Order.create({

//          userId,

//          totalAmount:amount

//       });

//       // STEP 2 → Create Razorpay Order
//       const options = {

//          amount: amount * 100,

//          currency:"INR",

//          receipt:`receipt_${order._id}`

//       };

//       const razorpayOrder =
//          await razorpay.orders.create(options);

//       // STEP 3 → Save Payment Record
//       await Payment.create({

//          userId,

//          orderId:order._id,

//          razorpayOrderId:razorpayOrder.id,

//          amount,

//       });

//       return res.status(200).json({

//          success:true,

//          order,

//          razorpayOrder

//       });

//    }catch(error){

//       console.log(error);

//       return res.status(500).json({

//          success:false,

//          message:error.message

//       });

//    }

// };

// export const verifyPayment = async (req,res)=>{

//    try{

//       const {

//          razorpay_order_id,

//          razorpay_payment_id,

//          razorpay_signature

//       } = req.body;

//       // STEP 1 → Generate Signature
//       const generatedSignature = crypto

//          .createHmac(

//             "sha256",

//             process.env.RAZORPAY_KEY_SECRET

//          )

//          .update(

//             razorpay_order_id + "|" + razorpay_payment_id

//          )

//          .digest("hex");

//       // STEP 2 → Compare Signature
//       if(generatedSignature !== razorpay_signature){

//          return res.status(400).json({

//             success:false,

//             message:"Payment verification failed"

//          });

//       }

//       // STEP 3 → Update Payment
//       const payment = await Payment.findOneAndUpdate(

//          { razorpayOrderId: razorpay_order_id },

//          {

//             razorpayPaymentId: razorpay_payment_id,

//             razorpaySignature: razorpay_signature,

//             status:"SUCCESS"

//          },

//          { new:true }

//       );

//       // STEP 4 → Update Order
//       await Order.findByIdAndUpdate(

//          payment.orderId,

//          {

//             status:"CONFIRMED"

//          }

//       );

//       return res.status(200).json({

//          success:true,

//          message:"Payment verified"

//       });

//    }catch(error){

//       console.log(error);

//       return res.status(500).json({

//          success:false,

//          message:error.message

//       });

//    }

// };

// export const razorpayWebhook = async (req, res) => {

//    try {

//       const secret =
//          process.env.RAZORPAY_WEBHOOK_SECRET;

//       const generatedSignature = crypto
//          .createHmac("sha256", secret)
//          .update(req.body)
//          .digest("hex");

//       const receivedSignature =
//          req.headers["x-razorpay-signature"];

//       // VERIFY SIGNATURE
//       if (generatedSignature !== receivedSignature) {

//          return res.status(400).json({
//             success: false,
//             message: "Invalid webhook signature"
//          });

//       }

//       // CONVERT BUFFER TO JSON
//       const eventData =
//          JSON.parse(req.body.toString());

//       const event = eventData.event;

//       console.log("Webhook Event:", event);

//       // PAYMENT SUCCESS
//       if (event === "payment.captured") {

//          const paymentEntity =
//             eventData.payload.payment.entity;

//          console.log(paymentEntity);

//          await Payment.findOneAndUpdate(

//             {
//                razorpayPaymentId:
//                   paymentEntity.id
//             },

//             {
//                webhookVerified: true,
//                status: "SUCCESS"
//             }

//          );

//       }

//       return res.status(200).json({
//          success: true
//       });

//    } catch (error) {

//       console.log(error);

//       return res.status(500).json({
//          success: false
//       });

//    }

// };
