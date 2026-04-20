import app from "./src/app.js";
import "./src/db/db.js";
import connectDB from "./src/db/db.js";




connectDB()



// app.listen(3000, () => {
//   console.log("Server running on port 3000");
// });


// to run locally and physical device
app.listen(3000, '0.0.0.0', () => {
  console.log("Server running on port 3000");
});