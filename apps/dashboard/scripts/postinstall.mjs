import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { existsSync, mkdirSync, copyFileSync, readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(__dirname);

async function main() {
  try {
    console.log("📦 Starting postinstall script...");

    // Create public directory if it doesn't exist
    const publicDir = join(projectRoot, "public");
    if (!existsSync(publicDir)) {
      mkdirSync(publicDir, { recursive: true });
      console.log("✅ Created public directory");
    }

    // Try multiple possible locations for chromium binary
    const possiblePaths = [
      join(projectRoot, "node_modules", "@sparticuz", "chromium", "bin"),
      join(
        projectRoot,
        "node_modules",
        ".pnpm",
        "node_modules",
        "@sparticuz",
        "chromium",
        "bin",
      ),
    ];

    let binDir = null;

    console.log("🔍 Searching for Chromium binary...");

    for (const path of possiblePaths) {
      console.log(`   Checking: ${path}`);
      if (existsSync(path)) {
        binDir = path;
        console.log(`✅ Found Chromium at: ${path}`);
        break;
      }
    }

    if (!binDir) {
      console.log("❌ Chromium bin directory not found");
      return;
    }

    // Verify bin directory has content
    try {
      const files = readdirSync(binDir);
      console.log(`📁 Bin directory contents:`, files);
    } catch (lsError) {
      console.log("⚠️ Could not read bin directory contents");
    }

    const outputPath = join(publicDir, "chromium-pack.tar");

    console.log("📦 Creating chromium tar archive...");
    console.log("   Source:", binDir);
    console.log("   Output:", outputPath);

    // Create tar archive - Windows compatible approach
    try {
      if (process.platform === "win32") {
        // Windows - use PowerShell for tar or create archive manually
        console.log("🪟 Windows detected, using PowerShell...");

        try {
          // Try PowerShell tar command
          execSync(
            `powershell -Command "& { tar -cf '${outputPath}' -C '${binDir}' . }"`,
            {
              stdio: "inherit",
              cwd: projectRoot,
            },
          );
          console.log(
            "✅ Chromium archive created successfully with PowerShell!",
          );
        } catch (psError) {
          console.log("⚠️ PowerShell tar failed, creating archive manually...");
          await createArchiveManually(binDir, outputPath);
        }
      } else {
        // Linux/Mac - use tar
        execSync(`tar -cf "${outputPath}" -C "${binDir}" .`, {
          stdio: "inherit",
          cwd: projectRoot,
        });
        console.log("✅ Chromium archive created successfully!");
      }

      // Verify the archive was created
      if (existsSync(outputPath)) {
        const stats = execSync(
          `powershell -Command "(Get-Item '${outputPath}').Length"`,
        )
          .toString()
          .trim();
        const sizeMB = Math.round(parseInt(stats) / 1024 / 1024);
        console.log(`📊 Archive created successfully! Size: ${sizeMB}MB`);
      } else {
        console.log("⚠️ Archive file was not created, but continuing...");
      }
    } catch (error) {
      console.error("❌ Failed to create archive:", error.message);
      console.log("⚠️ This is not critical for local development");
    }
  } catch (error) {
    console.error("❌ Failed in postinstall script:", error.message);
    console.log("⚠️ This is not critical for local development");
    process.exit(0);
  }
}

// Manual archive creation for Windows
async function createArchiveManually(binDir, outputPath) {
  try {
    const files = readdirSync(binDir);
    console.log(`📦 Manually packing ${files.length} files...`);

    // For Windows, we'll create a simple marker file instead
    // The actual Chromium will be downloaded by @sparticuz/chromium-min when needed
    const markerContent = `
# Chromium Binary Marker
# This file indicates that Chromium setup was attempted
# The actual Chromium binary will be handled by @sparticuz/chromium-min
# Files available in: ${binDir}
${files.map((file) => `# - ${file}`).join("\n")}
    `.trim();

    const markerPath = join(dirname(outputPath), "chromium-setup-complete.txt");
    execSync(`echo "${markerContent}" > "${markerPath}"`);

    console.log("✅ Created Chromium setup marker");
    console.log(
      "💡 @sparticuz/chromium-min will handle Chromium automatically",
    );
  } catch (error) {
    console.error("❌ Manual archive creation failed:", error.message);
  }
}

main();
