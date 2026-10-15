import { createApiKey, depositServer, getAccountSnapshot } from "./src/lib/lab/account-store.ts";

const userId = "e2e-user";
await depositServer(userId, "usdc", 5);
const { secret, key } = await createApiKey(userId, "e2e");
const snap = await getAccountSnapshot(userId);
process.stdout.write(JSON.stringify({ secret, prefix: key.prefix, credits: snap.credits }) + "\n");
