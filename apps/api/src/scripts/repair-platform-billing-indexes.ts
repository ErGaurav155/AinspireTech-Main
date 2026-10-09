import "dotenv/config";
import { connectToDatabase, mongoose } from "@/config/database.config";
import { ensurePlatformBillingIndexes } from "@/services/billing/platform-billing-index.service";

async function main() {
  await connectToDatabase();
  const result = await ensurePlatformBillingIndexes();
  console.info("Platform billing indexes are ready.", result);
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("Unable to repair platform billing indexes:", error);
    await mongoose.disconnect();
    process.exit(1);
  });
