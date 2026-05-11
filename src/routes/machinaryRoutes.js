import express from 'express';
import  {uploadVehicleImages} from "../middleware/upload.js"
import { createVehicle, getVehicles } from '../controllers/machinecontroller.js';
const router = express.Router();



//  4 wheeler routes
router.post("/four/add_brand", uploadVehicleImages.single("logo"), createVehicle);
 router.get("/four/get_brands", getVehicles);




// 2 wheeler routes

//router.post("/two/add_brand", uploadVehicleImages.single("logo"), createVehicle);

export default router;