import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionController } from './institution.controller';
import { PrismaService } from '../../database/prisma.service';

describe('InstitutionController', () => {
  let controller: InstitutionController;
  let mockPrismaService: any;

  beforeEach(async () => {
    mockPrismaService = {
      institution: {
        findMany: jest.fn().mockImplementation((args) => {
          const list = [
            { id: '1', name: 'Universidade de São Paulo', sigla: 'USP', uf: 'São Paulo' },
            { id: '2', name: 'Universidade Federal do Rio de Janeiro', sigla: 'UFRJ', uf: 'Rio de Janeiro' },
          ];

          if (!args?.where) {
            return list;
          }

          const query = args.where.OR[0].name.contains.toLowerCase();
          return list.filter(
            (inst) =>
              inst.name.toLowerCase().includes(query) ||
              (inst.sigla && inst.sigla.toLowerCase().includes(query)),
          );
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<InstitutionController>(InstitutionController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar até 30 instituições por padrão quando nenhuma busca é fornecida', async () => {
    const result = await controller.getInstitutions();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('sigla');
    expect(mockPrismaService.institution.findMany).toHaveBeenCalled();
  });

  it('deve filtrar instituições pelo nome (case insensitive)', async () => {
    const result = await controller.getInstitutions('Federal do Rio de Janeiro');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Universidade Federal do Rio de Janeiro');
  });

  it('deve filtrar instituições pela sigla', async () => {
    const result = await controller.getInstitutions('USP');
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('Universidade de São Paulo');
  });
});
