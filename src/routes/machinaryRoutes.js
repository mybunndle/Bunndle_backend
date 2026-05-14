import express from 'express';
import  {uploadVehicleImages} from "../middleware/upload.js"
import { createVehicle,
   getFourWheelerVehicles,
   getTwoWheelerVehicles,
   getHeavyMachineryVehicles,
   getConstructionVehicles,
    getCrainesAndliftingVehicles,
    getmedicalEquipments,
    getTrucksAndTrailers,
    getIndustrialTools,
    getPowerEquipments,
    getAgriculturalMachines,
    getMiningVehicles,
    getWarehouseEquipments,
    getConcreteAndRoadMachinaries

   } from '../controllers/machinecontroller.js';
const router = express.Router();



//  4 wheeler routes
router.post("/add_brand", uploadVehicleImages.single("logo"), createVehicle);



router.get("/four/get_brands", getFourWheelerVehicles);




// 2 wheeler routes
router.get("/two/get_brands", getTwoWheelerVehicles);


//heavy machinery routes
router.get("/heavy/get_brands", getHeavyMachineryVehicles);

//construction machinery routes

router.get("/construction/get_brands", getConstructionVehicles);


// craines and ligft routes

router.get("/cranes/get_brands", getCrainesAndliftingVehicles );


router.get("/concrete/get_brands",getConcreteAndRoadMachinaries)
router.get("/warehouse/get_brands", getWarehouseEquipments)
router.get("/mining/get_brands", getMiningVehicles)
router.get("/agricultural/get_brands", getAgriculturalMachines);
router.get("/power/get_brands",getPowerEquipments)
router.get("/industrial/get_brands", getIndustrialTools)
router.get("/trucks/get_brands", getTrucksAndTrailers)
router.get("/medical/get_brands",getmedicalEquipments)




export default router;