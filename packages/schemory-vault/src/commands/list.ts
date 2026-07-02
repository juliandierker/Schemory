import { table } from "cli-table3";
import { Command } from "commander";
import ora from "ora";
import { SchemoryClient } from "../api/client";
import { readConfig } from "../config/rc-file";

interface ListOptions {
  long: boolean;
  team: string;
}

export const listCommand = new Command()
  .name("list")
  .description("List schemas and types in the vault")
  .option("-l, --long", "Show detailed information")
  .option("-t, --team <id>", "List for a specific team (overrides config)")
  .action(async (options: ListOptions) => {
    const spinner = ora();

    try {
      const config = await readConfig();
      const client = new SchemoryClient({
        baseUrl: config.vaultUrl,
        teamId: options.team || config.teamId,
      });

      spinner.start("🔍 Connecting to vault...");
      await client.healthCheck();
      spinner.succeed("✅ Connected to vault");

      const teamId = options.team || config.teamId;

      // List schemas
      spinner.start("📋 Fetching schemas...");
      const { schemas } = await client.listSchemas(teamId);

      if (schemas.length > 0) {
        if (options.long) {
          const schemaTable = table("Schemas", {
            ID: "id",
            Name: "name",
            File: "fileName",
            Version: "version",
            Created: "createdAt",
          });

          for (const schema of schemas) {
            schemaTable.addRow({
              id: schema.id.slice(0, 8),
              name: schema.name,
              fileName: schema.fileName,
              version: schema.version,
              createdAt: new Date(schema.createdAt).toLocaleString(),
            });
          }

          console.log("\n" + schemaTable.toString());
          console.log(`Total: ${schemas.length} schemas`);
        } else {
          console.log(`\n📄 Schemas (${schemas.length}):`);
          for (const schema of schemas) {
            console.log(`  • ${schema.fileName} (v${schema.version})`);
          }
        }
      } else {
        console.log("\nℹ️  No schemas found");
      }

      // List types
      spinner.start("📋 Fetching type definitions...");
      const { types } = await client.listTypes(teamId);

      if (types.length > 0) {
        if (options.long) {
          const typeTable = table("Type Definitions", {
            ID: "id",
            Name: "name",
            File: "fileName",
            Version: "version",
            Created: "createdAt",
          });

          for (const type of types) {
            typeTable.addRow({
              id: type.id.slice(0, 8),
              name: type.name,
              fileName: type.fileName,
              version: type.version,
              createdAt: new Date(type.createdAt).toLocaleString(),
            });
          }

          console.log("\n" + typeTable.toString());
          console.log(`Total: ${types.length} type definitions`);
        } else {
          console.log(`\n🏷️  Type Definitions (${types.length}):`);
          for (const type of types) {
            console.log(`  • ${type.fileName} (v${type.version})`);
          }
        }
      } else {
        console.log("\nℹ️  No type definitions found");
      }

      console.log(`\n📊 Summary for team ${teamId}:`);
      console.log(`   Schemas: ${schemas.length}`);
      console.log(`   Types: ${types.length}`);
      console.log(`   Total: ${schemas.length + types.length} items`);
    } catch (error: any) {
      spinner.fail(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  });
