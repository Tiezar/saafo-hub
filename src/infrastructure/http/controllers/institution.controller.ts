import { Controller, Get, Query } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

interface InstitutionItem {
  alpha_two_code: string;
  country: string;
  name: string;
  'state-province': string | null;
  domains: string[];
  web_pages: string[];
}

@Controller('institutions')
export class InstitutionController {
  private institutions: InstitutionItem[] = [];

  constructor() {
    try {
      // Carregar a lista de instituições a partir do arquivo JSON estático
      const filePath = path.join(__dirname, '../../database/seeds/institutions.json');
      const fileContent = fs.readFileSync(filePath, 'utf8');
      this.institutions = JSON.parse(fileContent) as InstitutionItem[];
    } catch (error) {
      console.error('Erro ao carregar lista de instituições de ensino:', error);
      this.institutions = [];
    }
  }

  @Get()
  getInstitutions(@Query('search') search?: string) {
    if (!search) {
      // Retornar as primeiras 30 instituições por padrão se nenhuma busca for informada
      return this.institutions.slice(0, 30);
    }

    const query = search.toLowerCase().trim();
    
    // Filtrar por nome da instituição ou por domínios de email vinculados
    return this.institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(query) ||
        inst.domains.some((domain) => domain.toLowerCase().includes(query)),
    );
  }
}
