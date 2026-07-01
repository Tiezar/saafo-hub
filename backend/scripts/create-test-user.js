const { Pool } = require('pg');

const hash = '$2b$12$eL1alHhxCKPWjl5y003bEOulxRWXGIBrXuNF.wGYK8hmK0WDXvcNq'; // senha: teste123

const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/saafo_db?schema=public' });

async function main() {
  // Create/update user
  const userRes = await pool.query(`
    INSERT INTO users (id, email, name, nickname, "passwordHash", "emailVerified", role, "trialEndsAt", "createdAt", "updatedAt")
    VALUES (gen_random_uuid(), 'admin@saafo.local', 'Admin Teste', 'admin', $1, true, 'ADMIN', NOW() + interval '30 days', NOW(), NOW())
    ON CONFLICT (email) DO UPDATE SET "emailVerified" = true, role = 'ADMIN', "trialEndsAt" = NOW() + interval '30 days'
    RETURNING id
  `, [hash]);
  const uid = userRes.rows[0].id;
  console.log('User ID:', uid);

  // Find profile table name
  const tables = await pool.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log('All tables:', tables.rows.map(r => r.tablename).join(', '));

  // Try to create profile in user_profiles table
  const profileTables = tables.rows.map(r => r.tablename).filter(t => t.toLowerCase().includes('profile'));
  console.log('Profile tables:', profileTables);

  if (profileTables.length > 0) {
    const tbl = profileTables[0];
    await pool.query(`
      INSERT INTO "${tbl}" (id, "userId", "onboardingStatus", "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), $1, 'COMPLETED', NOW(), NOW())
      ON CONFLICT ("userId") DO UPDATE SET "onboardingStatus" = 'COMPLETED'
    `, [uid]).catch(e => console.log('Profile error:', e.message));
  }

  console.log('Done! Login with: admin@saafo.local / teste123');
  await pool.end();
}

main().catch(e => { console.error(e.message); process.exit(1); });
