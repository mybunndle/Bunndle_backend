// models/blacklistToken.model.js
import mongoose from "mongoose";
const blacklistTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires:  0}, // auto delete after expiry
  },
});

export default mongoose.model("BlacklistToken", blacklistTokenSchema);