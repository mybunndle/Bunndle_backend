import mongoose from "mongoose";
import config from "../config/config.js";



async function connectDB(){
  try {
    await mongoose.connect(config.MONGO_URI);
    console.log("mongodb connected")
    
  } catch (error) {
    console.log("error",error)
  }
}

export default connectDB