const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres@localhost:5432/saafo_db?schema=public' });
pool.query('SELECT * FROM user_profiles LIMIT 3')
  .then(r => { console.log(JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.log('Error:', e.message); pool.end(); });
