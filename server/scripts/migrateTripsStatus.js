const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGODB_URI_PROD
        : process.env.MONGODB_URI;

    if (!mongoURI) {
      throw new Error("MongoDB URI not configured. Please check your .env file.");
    }

    await mongoose.connect(mongoURI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error.message);
    process.exit(1);
  }
};

// Migration function
const migrateTripsStatus = async () => {
  try {
    console.log("Starting trips status migration...\n");

    // Update "booked" to "upcoming"
    const bookedResult = await mongoose.connection.db
      .collection("trips")
      .updateMany({ status: "booked" }, { $set: { status: "upcoming" } });

    console.log(
      `✓ Updated ${bookedResult.modifiedCount} trips from "booked" to "upcoming"`
    );

    // Update "planning" to "draft"
    const planningResult = await mongoose.connection.db
      .collection("trips")
      .updateMany({ status: "planning" }, { $set: { status: "draft" } });

    console.log(
      `✓ Updated ${planningResult.modifiedCount} trips from "planning" to "draft"`
    );

    // Get count of trips by status after migration
    console.log("\nCurrent status distribution:");
    const statusCounts = await mongoose.connection.db
      .collection("trips")
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    statusCounts.forEach((stat) => {
      console.log(`  ${stat._id}: ${stat.count} trips`);
    });

    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  }
};

// Run migration
const runMigration = async () => {
  try {
    await connectDB();
    await migrateTripsStatus();
    await mongoose.connection.close();
    console.log("\nDatabase connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

runMigration();
