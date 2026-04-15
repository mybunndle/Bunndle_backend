import mongoose from 'mongoose';
const assetSchema = new mongoose.Schema({
   userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },
  model:{
    type: String,
    required: true,
    trim: true
  },
  brand:{
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  files: [
  {
    url: {
      type: String,
      required: true
    },
    filename: {
      type: String,
      required: true
    }
  }
]

}, { timestamps: true });

export default mongoose.model('Asset', assetSchema);