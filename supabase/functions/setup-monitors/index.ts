import { createClient } from "jsr:@supabase/supabase-js@2";

// Called once to create the dna_monitors + dna_monitor_alerts tables.
// Uses the service role key available in the edge function environment.
Deno.serve(async () => {
  const url  = Deno.env.get("SUPABASE_URL")!;
  const key  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Use pg driver directly via the internal DATABASE_URL available in edge fns
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    return Response.json({ error: "SUPABASE_DB_URL not available" }, { status: 500 });
  }

  // @ts-ignore — Deno postgres client
  const { Pool } = await import("https://deno.land/x/postgres@v0.19.3/mod.ts");
  const pool = new Pool(dbUrl, 1, true);
  const conn = await pool.connect();

  try {
    await conn.queryObject(`
      CREATE TABLE IF NOT EXISTS dna_monitors (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dna_record_id  text NOT NULL UNIQUE,
        status         text NOT NULL DEFAULT 'active',
        enrolled_at    timestamptz NOT NULL DEFAULT now(),
        last_checked_at timestamptz,
        alerts_count   int NOT NULL DEFAULT 0,
        created_at     timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS dna_monitor_alerts (
        id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        dna_record_id  text NOT NULL,
        monitor_id     uuid,
        source_url     text,
        similarity     float,
        status         text NOT NULL DEFAULT 'pending',
        detected_at    timestamptz NOT NULL DEFAULT now(),
        created_at     timestamptz NOT NULL DEFAULT now()
      );
    `);

    return Response.json({ ok: true, message: "Tables created (or already existed)" });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  } finally {
    conn.release();
    await pool.end();
  }
});
