import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { PrismaService } from '../../database/prisma.service';
import { EvoApiService } from '../../notifications/evo-api.service';

const PAGE_SIZE = 50;

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly evoApi: EvoApiService,
  ) {}

  // ── GET /admin/users ───────────────────────────────────────────────────────

  @Get('users')
  async listUsers(
    @Query('page') page = '1',
    @Query('search') search = '',
    @Query('plan') plan = '',
  ) {
    const skip = (Math.max(1, parseInt(page)) - 1) * PAGE_SIZE;

    const where = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(plan && { plan }),
    };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: PAGE_SIZE,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          plan: true,
          trialEndsAt: true,
          createdAt: true,
          emailVerified: true,
          _count: {
            select: {
              subjects: true,
              cards: true,
              studySessions: true,
              examRecords: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const userIds = users.map((u) => u.id);

    // Cards generated today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cardsTodayRaw, sessionsWithReviews] = await Promise.all([
      this.prisma.card.groupBy({
        by: ['userId'],
        where: { userId: { in: userIds }, createdAt: { gte: today } },
        _count: { _all: true },
      }),
      this.prisma.studySession.findMany({
        where: { userId: { in: userIds } },
        select: { userId: true, _count: { select: { reviews: true } } },
      }),
    ]);

    const cardsTodayMap = new Map(
      cardsTodayRaw.map((r) => [r.userId, r._count._all]),
    );

    const reviewsMap = new Map<string, number>();
    for (const s of sessionsWithReviews) {
      reviewsMap.set(
        s.userId,
        (reviewsMap.get(s.userId) ?? 0) + s._count.reviews,
      );
    }

    const data = users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      plan: u.plan,
      trialEndsAt: u.trialEndsAt,
      createdAt: u.createdAt,
      emailVerified: u.emailVerified,
      usage: {
        subjects: u._count.subjects,
        cards: u._count.cards,
        studySessions: u._count.studySessions,
        examRecords: u._count.examRecords,
        cardsGeneratedToday: cardsTodayMap.get(u.id) ?? 0,
        totalReviews: reviewsMap.get(u.id) ?? 0,
      },
    }));

    return {
      data,
      meta: {
        total,
        page: parseInt(page),
        pageSize: PAGE_SIZE,
        pages: Math.ceil(total / PAGE_SIZE),
      },
    };
  }

  // ── GET /admin/users/:id ───────────────────────────────────────────────────

  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        trialEndsAt: true,
        createdAt: true,
        emailVerified: true,
        phone: true,
        asaasSubscriptionId: true,
        _count: {
          select: {
            subjects: true,
            cards: true,
            studySessions: true,
            examRecords: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('Usuário não encontrado.');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [cardsTodayRaw, sessionsWithReviews, lastSession] = await Promise.all(
      [
        this.prisma.card.count({
          where: { userId: id, createdAt: { gte: today } },
        }),
        this.prisma.studySession.findMany({
          where: { userId: id },
          select: { _count: { select: { reviews: true } } },
        }),
        this.prisma.studySession.findFirst({
          where: { userId: id },
          orderBy: { startedAt: 'desc' },
          select: { startedAt: true },
        }),
      ],
    );

    const totalReviews = sessionsWithReviews.reduce(
      (sum, s) => sum + s._count.reviews,
      0,
    );

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      createdAt: user.createdAt,
      emailVerified: user.emailVerified,
      phone: user.phone,
      asaasSubscriptionId: user.asaasSubscriptionId,
      usage: {
        subjects: user._count.subjects,
        cards: user._count.cards,
        studySessions: user._count.studySessions,
        examRecords: user._count.examRecords,
        cardsGeneratedToday: cardsTodayRaw,
        totalReviews,
        lastActivityAt: lastSession?.startedAt ?? null,
      },
    };
  }

  // ── POST /admin/test-whatsapp ──────────────────────────────────────────────

  @Post('test-whatsapp')
  async testWhatsApp(@Req() req: any) {
    if (!this.evoApi.isConfigured) {
      throw new BadRequestException(
        'Evolution API não configurada. Verifique EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_API_INSTANCE.',
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { phone: true, name: true },
    });

    if (!user?.phone) {
      throw new BadRequestException(
        'Seu usuário não tem número de WhatsApp cadastrado. Adicione em Perfil → WhatsApp.',
      );
    }

    await this.evoApi.sendWhatsApp(
      user.phone,
      `✅ *SAAFO HUB — Teste de integração*\n\nOlá, ${user.name}! A conexão com o WhatsApp está funcionando corretamente.`,
    );

    return { ok: true, sentTo: user.phone };
  }
}
