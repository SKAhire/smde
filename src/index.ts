import dotenv from "dotenv";
import app from "./app";
import { prisma } from "./lib/prisma";

dotenv.config();

const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});

const gracefulShutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");

  server.close(async () => {
    console.log("✅ HTTP server closed");

    // Disconnect prisma client
    await prisma.$disconnect();
    console.log("✅ Database connection closed");

    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});