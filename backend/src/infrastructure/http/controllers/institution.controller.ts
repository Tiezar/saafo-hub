import { Controller, Get, Post, Query, Body, BadRequestException } from '@nestjs/common';
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

  @Post()
  async createInstitution(@Body() body: { name: string; sigla?: string }) {
    if (!body.name || body.name.trim() === '') {
      throw new BadRequestException('Nome da instituição não pode ser vazio.');
    }
    const name = body.name.trim();
    // Check if it already exists (case insensitive)
    const existing = await this.prisma.institution.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    });
    if (existing) {
      return existing;
    }
    // Create new
    return this.prisma.institution.create({
      data: {
        name,
        sigla: body.sigla?.trim() || null,
        domains: [],
      },
    });
  }
}
