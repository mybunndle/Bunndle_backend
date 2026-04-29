import express from "express";
import {
  addAddress,
  updateAddress,
  getAddresses,
  deleteAddress,
  createAddressFromPincode,
} from "../controllers/addresscontroller.js";
import authMiddleware from "../middleware/auth_validate.js";

const router = express.Router();

router.post("/add_address", authMiddleware, addAddress);
router.post("/pincode_details", authMiddleware, createAddressFromPincode)
router.put("/update_address/:addressId", authMiddleware, updateAddress);
router.get("/get_addresses", authMiddleware, getAddresses);
router.delete("/delete_address/:addressId", authMiddleware, deleteAddress);


export default router;
