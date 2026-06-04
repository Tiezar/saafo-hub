import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionController } from './institution.controller';

describe('InstitutionController', () => {
  let controller: InstitutionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionController],
    }).compile();

    controller = module.get<InstitutionController>(InstitutionController);
  });

  it('deve ser definido', () => {
    expect(controller).toBeDefined();
  });

  it('deve retornar até 30 instituições por padrão quando nenhuma busca é fornecida', () => {
    const result = controller.getInstitutions();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('domains');
  });

  it('deve filtrar instituições pelo nome (case insensitive)', () => {
    const result = controller.getInstitutions('Federal do Rio de Janeiro');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('Universidade Federal do Rio de Janeiro');
  });

  it('deve filtrar instituições pelo domínio', () => {
    const result = controller.getInstitutions('usp.br');
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe('Universidade de São Paulo');
  });

  it('deve retornar array vazio para busca sem correspondência', () => {
    const result = controller.getInstitutions('InstituicaoInexistente123');
    expect(result).toEqual([]);
  });
});
