import crypto from "crypto";
import Order from "../model/OrderModel.js";
import Payment from "../model/PaymentModel.js";
import razorpay from "../config/razorpay.js";

export  const createOrder = async (req,res)=>{

   try{

      const userId = req.user.id;
 
      const { amount } = req.body;

      // STEP 1 → Save Order In MongoDB
      const order = await Order.create({

         userId,

         totalAmount:amount

      });

      // STEP 2 → Create Razorpay Order
      const options = {

         amount: amount * 100,

         currency:"INR",

         receipt:`receipt_${order._id}`

      };

      const razorpayOrder =
         await razorpay.orders.create(options);

      // STEP 3 → Save Payment Record
      await Payment.create({

         userId,

         orderId:order._id,

         razorpayOrderId:razorpayOrder.id,

         amount,

      });

      return res.status(200).json({

         success:true,

         order,

         razorpayOrder

      });

   }catch(error){

      console.log(error);

      return res.status(500).json({

         success:false,

         message:error.message

      });

   }

};




export const verifyPayment = async (req,res)=>{

   try{

      const {

         razorpay_order_id,

         razorpay_payment_id,

         razorpay_signature

      } = req.body;

      // STEP 1 → Generate Signature
      const generatedSignature = crypto

         .createHmac(

            "sha256",

            process.env.RAZORPAY_KEY_SECRET

         )

         .update(

            razorpay_order_id + "|" + razorpay_payment_id

         )

         .digest("hex");

      // STEP 2 → Compare Signature
      if(generatedSignature !== razorpay_signature){

         return res.status(400).json({

            success:false,

            message:"Payment verification failed"

         });

      }

      // STEP 3 → Update Payment
      const payment = await Payment.findOneAndUpdate(

         { razorpayOrderId: razorpay_order_id },

         {

            razorpayPaymentId: razorpay_payment_id,

            razorpaySignature: razorpay_signature,

            status:"SUCCESS"

         },

         { new:true }

      );

      // STEP 4 → Update Order
      await Order.findByIdAndUpdate(

         payment.orderId,

         {

            status:"CONFIRMED"

         }

      );

      return res.status(200).json({

         success:true,

         message:"Payment verified"

      });

   }catch(error){

      console.log(error);

      return res.status(500).json({

         success:false,

         message:error.message

      });

   }

};


export const razorpayWebhook = async (req,res)=>{

   try{

      const secret =
         process.env.RAZORPAY_WEBHOOK_SECRET;

      const shasum = crypto.createHmac(

         "sha256",

         secret

      );

      shasum.update(JSON.stringify(req.body));

      const digest = shasum.digest("hex");

      // Verify webhook
      if(digest !== req.headers["x-razorpay-signature"]){

         return res.status(400).json({

            success:false

         });

      }

      const event = req.body.event;

      // Payment success webhook
      if(event === "payment.captured"){

         const paymentEntity =
            req.body.payload.payment.entity;

         await Payment.findOneAndUpdate(

            {

               razorpayPaymentId:
                  paymentEntity.id

            },

            {

               webhookVerified:true

            }

         );

      }

      return res.status(200).json({

         success:true

      });

   }catch(error){

      console.log(error);

      return res.status(500).json({

         success:false

      });

   }

};