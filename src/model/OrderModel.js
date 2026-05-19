import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
   userId:{
      type: mongoose.Schema.Types.ObjectId,
      ref:"User"
   },
   totalAmount:Number,
   status:{
      type:String,
      enum:[
         "PENDING_PAYMENT",
         "CONFIRMED",
         "FAILED"
      ],
      default:"PENDING_PAYMENT"
   }

},{timestamps:true});

export default mongoose.model("Order", orderSchema);