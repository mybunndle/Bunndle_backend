import app from "./src/app.js";
import connectDB from "./src/db/db.js";

const PORT = process.env.PORT || 3000;

// Root route
app.get("/", (req, res) => {
  res.send("🚀 Server is up and running");
});

// Start server only after DB connects
connectDB()
  .then(() => {

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Server running on port ${PORT}`
      );
    });

  })
  .catch((error) => {

    console.error(
      "MongoDB connection failed:",
      error
    );

  });