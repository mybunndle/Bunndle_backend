import mongoose from "mongoose";


const getIndianTime = () => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  return new Date(Date.now() + istOffset);
};

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

},{timestamps:{
      currentTime: getIndianTime,
    },});

export default mongoose.model("Payment", paymentSchema);