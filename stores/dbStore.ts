import * as schema from "@/db/schema";
// import migrations from "@/drizzle/migrations";
import type { ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import { drizzle } from "drizzle-orm/expo-sqlite";
// import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import { create } from "zustand";

function ensureRoastTables(expoDb: ReturnType<typeof openDatabaseSync>) {
    expoDb.execSync(`
CREATE TABLE IF NOT EXISTS roasts (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    request_id text NOT NULL,
    provider text NOT NULL DEFAULT 'gemini',
    model text NOT NULL,
    input_type text NOT NULL,
    input_text text,
    input_image_uri text,
    audience text NOT NULL,
    burn_level integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    error_message text,
    variant_count integer NOT NULL DEFAULT 1,
    selected_variant_index integer NOT NULL DEFAULT 0,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000),
    updated_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);
`);

    expoDb.execSync(`
CREATE TABLE IF NOT EXISTS roast_variants (
    id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    roast_id integer NOT NULL REFERENCES roasts(id) ON DELETE CASCADE,
    variant_index integer NOT NULL,
    content text NOT NULL,
    is_favorite integer NOT NULL DEFAULT 0,
    created_at integer NOT NULL DEFAULT (unixepoch() * 1000)
);
`);

    expoDb.execSync(`
CREATE UNIQUE INDEX IF NOT EXISTS roasts_request_id_uq ON roasts (request_id);
CREATE INDEX IF NOT EXISTS roasts_created_at_idx ON roasts (created_at);
CREATE INDEX IF NOT EXISTS roast_variants_roast_id_idx ON roast_variants (roast_id);
CREATE UNIQUE INDEX IF NOT EXISTS roast_variants_roast_id_variant_idx_uq ON roast_variants (roast_id, variant_index);
`);
}

interface DatabaseState {
    expoDb: ReturnType<typeof openDatabaseSync> | null;
    db: ExpoSQLiteDatabase<typeof schema> | null;
    isLoading: boolean;

    initializeDb: (options?: {
        name?: string;
        useNewConnection?: boolean;
        enableChangeListener?: boolean;
    }) => Promise<void>;
    setNewDbInstance: (dbName: string) => Promise<void>;

    setExpoDb: (expoDb: ReturnType<typeof openDatabaseSync>) => void;
    setDb: (db: ExpoSQLiteDatabase<typeof schema>) => void;
}

export const useDbStore = create<DatabaseState>((set, get) => ({
    expoDb: null,
    db: null,
    isLoading: false,

    initializeDb: async (options = {}) => {
        const {
            name = "mirusiu.db",
            useNewConnection = false,
            enableChangeListener = true,
        } = options;

        // prevent re-init only if db is a real drizzle client
        const existing = get().db as any;
        if (existing && typeof existing.insert === "function") return;

        set({ isLoading: true });

        try {
            const expoDb = openDatabaseSync(name, {
                useNewConnection,
                enableChangeListener,
            });
            ensureRoastTables(expoDb);

            const db = drizzle(expoDb, { schema });
            // await migrate(db, migrations);

            set({ expoDb, db, isLoading: false });
        } catch (e) {
            set({ isLoading: false });
            throw e;
        }
    },

    setNewDbInstance: async (dbName: string) => {
        try {
            const { expoDb } = get();

            await expoDb?.closeAsync();

            set({ expoDb: null, db: null });

            const newExpoDb = openDatabaseSync(dbName, {
                useNewConnection: true,
                enableChangeListener: true,
            });

            if (!newExpoDb) {
                throw new Error("Failed to create new database instance");
            }
            ensureRoastTables(newExpoDb);

            const newDb = drizzle(newExpoDb, { schema });

            set({ expoDb: newExpoDb, db: newDb });
        } catch (error) {
            console.error("Error setting new database instance", error);
            throw error;
        }
    },

    setExpoDb: (expoDb: ReturnType<typeof openDatabaseSync>) => {
        set({ expoDb });
    },

    setDb: (db: ExpoSQLiteDatabase<typeof schema>) => {
        set({ db });
    },
}));
