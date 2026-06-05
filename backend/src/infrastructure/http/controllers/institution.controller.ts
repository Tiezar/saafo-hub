import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Controller('institutions')
export class InstitutionController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getInstitutions(@Query('search') search?: string) {
    if (!search) {
      // Retornar as primeiras 30 instituições por padrão se nenhuma busca for informada
      return this.prisma.institution.findMany({
        take: 30,
        orderBy: { name: 'asc' },
      });
    }

    const query = search.trim();

    return this.prisma.institution.findMany({
      take: 30,
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { sigla: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
    });
  }
}
