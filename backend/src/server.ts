import { app } from "./app";
import { env } from "./config/env";
import { migrateAndSeed } from "./db/migrate";
import { sweepExpiredHolds } from "./services/booking.service";

async function main() {
  for (let i = 0; i < 20; i++) { // wait for the database to be ready
    try { await migrateAndSeed(); break; }
    catch (e: any) { if (i === 19) throw e; console.log("Waiting for database..."); await new Promise(r => setTimeout(r, 1500)); }
  }
  setInterval(() => sweepExpiredHolds().catch(e => console.error("sweep failed", e.message)), 10_000);
  app.listen(env.port, () => console.log(`SeatLock API on :${env.port}`));
}
main();
