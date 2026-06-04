import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface SeedInstitution {
  name: string;
  'state-province'?: string | null;
  domains?: string[];
}

async function main() {
  console.log('Iniciando o seeding de instituições de ensino...');

  const filePath = path.join(__dirname, '../src/infrastructure/database/seeds/institutions.json');
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const institutions = JSON.parse(fileContent) as SeedInstitution[];

  for (const inst of institutions) {
    let sigla: string | null = null;
    const siglaMatch = inst.name.match(/,\s*([A-Z]{2,})|–\s*([A-Za-z]+)|-\s*([A-Z]+)$/);
    if (siglaMatch) {
      sigla = siglaMatch[1] || siglaMatch[2] || siglaMatch[3] || null;
    } else {
      const parts = inst.name.split(' ');
      const acronyms = parts.filter(p => p === p.toUpperCase() && p.length > 2 && /^[A-Z]+$/.test(p));
      if (acronyms.length > 0) {
        sigla = acronyms[0];
      } else if (inst.domains && inst.domains.length > 0) {
        const firstDomain = inst.domains[0];
        const domainParts = firstDomain.split('.');
        if (domainParts[0] !== 'aluno' && domainParts[0] !== 'sempreceub') {
          sigla = domainParts[0].toUpperCase();
        }
      }
    }

    await prisma.institution.upsert({
      where: { name: inst.name },
      update: {
        sigla: sigla || undefined,
        uf: inst['state-province'] || undefined,
        domains: inst.domains || [],
      },
      create: {
        name: inst.name,
        sigla: sigla,
        uf: inst['state-province'] || null,
        domains: inst.domains || [],
      },
    });
  }

  console.log(`Seeding concluído! ${institutions.length} instituições inseridas/atualizadas.`);
}

main()
  .catch((e) => {
    console.error('Erro ao executar o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
