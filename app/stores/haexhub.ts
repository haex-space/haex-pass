// stores/haexhub.ts
import type { SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import * as schema from "~/database/schemas";

// Import all migration SQL files
const migrationFiles = import.meta.glob("../database/migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});

export const useHaexHubStore = defineStore("haexhub", () => {
  const nuxtApp = useNuxtApp();

  const isInitialized = ref(false);
  const orm = shallowRef<SqliteRemoteDatabase<typeof schema> | null>(null);

  // Get composables at the top of the store setup
  const { currentThemeName, context } = storeToRefs(useUiStore());
  const { defaultLocale, locales, setLocale } = useI18n();

  // Lazy getter for haexVault to ensure plugin is loaded
  const getHaexVault = () => {
    const haexVault = nuxtApp.$haexVault;
    if (!haexVault) {
      throw new Error("HaexVault plugin not available. Make sure the store is only used client-side.");
    }
    return haexVault;
  };

  // Run migrations directly via database.execute
  const runMigrationsAsync = async () => {
    const haexVault = getHaexVault();

    // Convert migration files to sorted array
    const migrations = Object.entries(migrationFiles)
      .map(([path, content]) => {
        const fileName = path.split("/").pop()?.replace(".sql", "") || "";
        return {
          name: fileName,
          sql: content as string,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`[haex-pass] Running ${migrations.length} migration(s)`);

    for (const migration of migrations) {
      console.log(`[haex-pass] Applying migration: ${migration.name}`);

      // Split SQL by statement separator and execute each statement
      const statements = migration.sql
        .split("--> statement-breakpoint")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      for (const statement of statements) {
        try {
          await haexVault.client.database.execute(statement, []);
        } catch (error: unknown) {
          // Ignore "table already exists" errors for idempotent migrations
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (!errorMessage.includes("already exists")) {
            console.error(`[haex-pass] Migration error in ${migration.name}:`, error);
            throw error;
          }
        }
      }
    }

    console.log("[haex-pass] All migrations completed");
  };

  // Initialize database and setup hook (runs once)
  const initializeAsync = async () => {
    if (isInitialized.value) return;

    const haexVault = getHaexVault();

    console.log("[haex-pass] Initializing HaexVault SDK");

    // Register setup hook for database migrations
    // IMPORTANT: This must be done BEFORE calling setupComplete()
    haexVault.client.onSetup(async () => {
      await runMigrationsAsync();
    });

    // Initialize database schema
    orm.value = haexVault.client.initializeDatabase(schema);
    console.log("[haex-pass] Database initialized:", !!orm.value);

    // Trigger setup to run the registered hook (migrations)
    // This will execute the hook we registered above
    await haexVault.client.setupComplete();
    console.log("[haex-pass] Setup complete");

    // Setup context watcher
    watch(
      () => haexVault.state.value.context,
      (newContext) => {
        console.log("[haex-pass] Context changed:", newContext);
        if (!newContext) return;

        context.value = newContext;
        currentThemeName.value = newContext.theme || "dark";

        const locale =
          locales.value.find((l) => l.code === newContext.locale)?.code ||
          defaultLocale;

        setLocale(locale);
      },
      { immediate: true }
    );

    isInitialized.value = true;
  };

  // Wait for setup to complete
  const waitForSetupAsync = async () => {
    const haexVault = getHaexVault();
    if (haexVault.state.value.isSetupComplete) return;

    console.log("[haex-pass] Waiting for setup completion...");
    await haexVault.client.setupComplete();
    console.log("[haex-pass] Setup complete");
  };

  return {
    get client() {
      return getHaexVault().client;
    },
    get state() {
      return getHaexVault().state;
    },
    orm,
    getTableName: (tableName: string) => getHaexVault().client.getTableName(tableName),
    initializeAsync,
    waitForSetupAsync,
  };
});
