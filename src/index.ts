import "dotenv/config";
import { env } from "./config/env";
import app from "./app";
import { prisma } from "./lib/prisma";

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});

const gracefulShutdown = async () => {
  console.log("\n🛑 Shutting down gracefully...");

  server.close(async () => {
    console.log("✅ HTTP server closed");

    await prisma.$disconnect();
    console.log("✅ Database disconnected");

    process.exit(0);
  });

  setTimeout(() => {
    console.error("⚠️ Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  gracefulShutdown();
});
