import app from "./src/app.js";
import connectDB from "./src/db/db.js";
import "./src/cron/cronExecute.js";

const PORT = process.env.PORT || 3000;

// Root route
app.get("/", (req, res) => {
  res.send("🚀 Serverrrr is up and running");
});

// Start server only after DB connects
connectDB()
  .then(() => {

    const server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on port ${PORT}`);
    });

    // ✅ Increase request timeout to 5 minutes
    server.timeout = 300000;

    // ✅ Optional but recommended
    server.keepAliveTimeout = 300000;
    server.headersTimeout = 310000;

  })
  .catch((error) => {

    console.error(
      "MongoDB connection failed:",
      error
    );
  });