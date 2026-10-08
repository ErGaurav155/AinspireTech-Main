import "dotenv/config";
import { connectToDatabase, mongoose } from "@/config/database.config";
import { syncPlatformCatalog } from "@/services/billing/platform-catalog-sync.service";

async function main() {
  await connectToDatabase();
  const result = await syncPlatformCatalog();
  console.info(
    `Synchronized ${result.plans} agency plans and ${result.addons} add-ons.`,
  );
}

main()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exit(1);
  });
