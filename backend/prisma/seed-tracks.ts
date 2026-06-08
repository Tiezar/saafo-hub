import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing tracks first to avoid duplicates
  await prisma.curatedTrack.deleteMany({});
  
  await prisma.curatedTrack.createMany({
    data: [
      { name: '🎧 Lofi Girl Focus', youtubeId: 'jfKfPfyJRdk' },
      { name: '🌧️ Som de Chuva Intensa', youtubeId: 'hBGwt25VJ-s' },
      { name: '☕ Café Ambient (Jazz)', youtubeId: '5w3T1Jg0t6w' },
      { name: '🌲 Sons da Floresta', youtubeId: 'mPZkdNFkNps' },
    ],
  });
  console.log('Seed de músicas curadas concluído.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
