import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({

   userId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"User"
   },

   orderId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"Order"
   },

   razorpayOrderId:String,

   razorpayPaymentId:String,

   razorpaySignature:String,

   amount:Number,

   status:{
      type:String,
      enum:[
         "PENDING",
         "SUCCESS",
         "FAILED",
         "REFUNDED"
      ],
      default:"PENDING"
   },

   webhookVerified:{
      type:Boolean,
      default:false
   }

},{timestamps:true});

export default mongoose.model("Payment", paymentSchema);