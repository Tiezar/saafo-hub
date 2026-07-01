import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Request,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsIn,
  IsOptional,
  IsArray,
  IsBoolean,
} from 'class-validator';

class CreateExamRecordDto {
  @IsString() @IsNotEmpty() topicName: string;
  @IsString() @IsOptional() scopeLabel?: string;
  @IsIn(['multiple', 'essay']) mode: 'multiple' | 'essay';
  @IsArray() questions: any[];
  @IsString() @IsOptional() topicId?: string;
  @IsArray() @IsOptional() @IsString({ each: true }) topicIds?: string[];
  @IsString() @IsOptional() profileId?: string;
  @IsBoolean() @IsOptional() isOfficialSimulation?: boolean;
  @IsBoolean() @IsOptional() hasPrintedBubble?: boolean;
}

class SaveAttemptDto {
  @IsInt() @Min(0) @Max(100) score: number;
  @IsInt() @IsOptional() @Min(0) timeLimit?: number;
  @IsInt() @IsOptional() @Min(0) timeTaken?: number;
}

@Controller('exams')
@UseGuards(JwtAuthGuard)
export class ExamHistoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async createRecord(@Request() req: any, @Body() body: CreateExamRecordDto) {
    return this.prisma.examRecord.create({
      data: {
        userId: req.user.id,
        topicId: body.topicId ?? null,
        topicIds: body.topicIds ?? [],
        topicName: body.topicName,
        scopeLabel: body.scopeLabel ?? null,
        profileId: body.profileId ?? null,
        mode: body.mode,
        questions: body.questions,
        isOfficialSimulation: body.isOfficialSimulation ?? false,
        hasPrintedBubble: body.hasPrintedBubble ?? false,
      },
    });
  }

  @Get()
  async listRecords(@Request() req: any) {
    return this.prisma.examRecord.findMany({
      where: { userId: req.user.id },
      include: { attempts: { orderBy: { completedAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async getRecord(@Request() req: any, @Param('id') id: string) {
    const record = await this.prisma.examRecord.findUnique({
      where: { id },
      include: { attempts: { orderBy: { completedAt: 'asc' } } },
    });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();
    return record;
  }

  @Post(':id/attempts')
  async saveAttempt(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: SaveAttemptDto,
  ) {
    const record = await this.prisma.examRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();

    return this.prisma.examAttempt.create({
      data: {
        examRecordId: id,
        score: body.score,
        timeLimit: body.timeLimit ?? null,
        timeTaken: body.timeTaken ?? null,
      },
    });
  }

  @Delete(':id')
  async deleteRecord(@Request() req: any, @Param('id') id: string) {
    const record = await this.prisma.examRecord.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();

    await this.prisma.examRecord.delete({ where: { id } });
    return { ok: true };
  }

  // ── GET /exams/:id/print ──────────────────────────────────────────────────
  // Returns HTML designed for browser print-to-PDF with ENEM style columns
  @Get(':id/print')
  async printExam(
    @Request() req: any,
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const record = await this.prisma.examRecord.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!record) throw new NotFoundException('Prova não encontrada.');
    if (record.userId !== req.user.id) throw new ForbiddenException();

    const questionsList = record.questions as any[];
    const formattedQuestions = questionsList
      .map((q, idx) => {
        const optionsLetters = ['A', 'B', 'C', 'D', 'E'];
        const renderedOptions = q.options
          .map((opt: string, optIdx: number) => {
            return `<li><span class="option-letter">(${optionsLetters[optIdx]})</span> ${opt}</li>`;
          })
          .join('');

        return `
        <div class="question-block">
          <p class="question-title">QUESTÃO ${idx + 1}</p>
          ${q.textBase ? `<div class="text-base">${q.textBase}</div>` : ''}
          <p class="question-statement">${q.question}</p>
          <ul class="options-list">
            ${renderedOptions}
          </ul>
        </div>
      `;
      })
      .join('');

    // Generate Bubble Sheet Rows
    const bubbleRows = questionsList
      .map((_, idx) => {
        const optionsLetters = ['A', 'B', 'C', 'D', 'E'];
        const optionsRender = optionsLetters
          .map((l) => `<span class="bubble">${l}</span>`)
          .join('');
        return `
        <div class="bubble-row">
          <span class="row-num">${String(idx + 1).padStart(2, '0')}</span>
          ${optionsRender}
        </div>
      `;
      })
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Prova - ${record.topicName}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          
          body {
            font-family: 'Inter', sans-serif;
            color: #1f2937;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 11pt;
          }

          /* Printable page dimensions */
          @page {
            size: A4;
            margin: 15mm;
          }

          .page {
            page-break-after: always;
            position: relative;
            box-sizing: border-box;
          }

          .page:last-child {
            page-break-after: avoid;
          }

          /* Cover Page CSS */
          .cover {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            height: 260mm;
            border: 2px solid #111827;
            padding: 20mm;
            box-sizing: border-box;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #111827;
            padding-bottom: 5mm;
          }

          .header h1 {
            font-size: 24pt;
            font-weight: 700;
            margin: 0 0 2mm 0;
            letter-spacing: 1px;
          }

          .header p {
            font-size: 12pt;
            margin: 0;
            color: #4b5563;
          }

          .student-info {
            margin: 15mm 0;
            border: 1px solid #111827;
            padding: 5mm;
          }

          .student-info p {
            margin: 2mm 0;
          }

          .instructions {
            background-color: #f9fafb;
            border: 1px dashed #4b5563;
            padding: 8mm;
            font-size: 10pt;
          }

          .instructions h3 {
            margin-top: 0;
            font-weight: 700;
          }

          .instructions ul {
            padding-left: 5mm;
            margin: 0;
          }

          .instructions li {
            margin-bottom: 2mm;
          }

          /* Questions Page CSS (2 Columns) */
          .questions-container {
            column-count: 2;
            column-gap: 8mm;
            column-rule: 1px solid #e5e7eb;
            text-align: justify;
          }

          .question-block {
            break-inside: avoid;
            margin-bottom: 8mm;
          }

          .question-title {
            font-weight: 700;
            font-size: 11pt;
            margin: 0 0 2mm 0;
            background-color: #f3f4f6;
            padding: 1mm 2mm;
            display: inline-block;
          }

          .text-base {
            font-size: 9.5pt;
            font-style: italic;
            background-color: #f9fafb;
            border-left: 3px solid #9ca3af;
            padding: 2mm;
            margin-bottom: 3mm;
          }

          .question-statement {
            margin: 0 0 3mm 0;
            font-weight: 600;
          }

          .options-list {
            list-style: none;
            padding-left: 0;
            margin: 0;
          }

          .options-list li {
            margin-bottom: 2mm;
            font-size: 10pt;
          }

          .option-letter {
            font-weight: 700;
            margin-right: 1mm;
          }

          /* Response Sheet Page CSS */
          .bubble-sheet-page {
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10mm;
          }

          .bubble-sheet-title {
            font-size: 18pt;
            font-weight: 700;
            margin-bottom: 10mm;
            text-align: center;
          }

          .bubble-sheet-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5mm 15mm;
            border: 1px solid #111827;
            padding: 10mm;
            border-radius: 5px;
          }

          .bubble-row {
            display: flex;
            align-items: center;
            gap: 3mm;
            padding: 2mm 0;
          }

          .row-num {
            font-weight: 700;
            width: 8mm;
            text-align: right;
            font-size: 11pt;
          }

          .bubble {
            display: inline-flex;
            justify-content: center;
            align-items: center;
            width: 8mm;
            height: 8mm;
            border: 1.5px solid #111827;
            border-radius: 50%;
            font-size: 9pt;
            font-weight: 700;
            cursor: pointer;
          }

          /* Print Overrides */
          @media print {
            body {
              font-size: 10pt;
            }
            .no-print {
              display: none;
            }
          }

          /* Top Floating Control Bar */
          .control-bar {
            background-color: #1f2937;
            color: white;
            padding: 4mm 10mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          }

          .print-btn {
            background-color: #2563eb;
            color: white;
            border: none;
            padding: 2mm 5mm;
            font-size: 11pt;
            font-weight: 600;
            border-radius: 4px;
            cursor: pointer;
          }

          .print-btn:hover {
            background-color: #1d4ed8;
          }
        </style>
      </head>
      <body>
        <div class="control-bar no-print">
          <span>Caderno de Provas Digital — SAAFO HUB</span>
          <button class="print-btn" onclick="window.print()">Imprimir Prova / Salvar PDF</button>
        </div>

        <!-- PAGE 1: COVER PAGE -->
        <div class="page cover">
          <div class="header">
            <h1>SAAFO HUB</h1>
            <p>SISTEMA ADAPTATIVO ACADÊMICO DE EXAMES</p>
          </div>

          <div>
            <h2 style="text-align: center; font-size: 18pt; margin-bottom: 5mm;">CADERNO DE SIMULADO</h2>
            <p style="text-align: center; font-size: 14pt; font-weight: 600; margin: 0;">Foco: ${record.topicName}</p>
            <p style="text-align: center; color: #6b7280; font-size: 11pt;">Modalidade: Múltipla Escolha</p>

            <div class="student-info">
              <p><strong>Estudante:</strong> ${record.user.name}</p>
              <p><strong>E-mail:</strong> ${record.user.email}</p>
              <p><strong>Data de Geração:</strong> ${new Date(record.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div class="instructions">
            <h3>INSTRUÇÕES GERAIS PARA A PROVA:</h3>
            <ul>
              <li>Este caderno contém exatamente <strong>${questionsList.length} questões</strong> de múltipla escolha.</li>
              <li>Preencha o seu nome e informações cadastrais no espaço indicado.</li>
              <li>Leia atentamente as questões antes de responder. Cada questão tem apenas uma alternativa correta.</li>
              <li>A folha de respostas oficiais (Cartão-Resposta) está localizada na última página deste caderno.</li>
              <li>Para a marcação do gabarito oficial, utilize caneta esferográfica de tinta azul ou preta.</li>
              <li>Preencha a bolha da resposta por completo. Marcações rasuradas ou incompletas serão anuladas pelo leitor óptico.</li>
            </ul>
          </div>

          <div style="text-align: center; font-size: 9pt; color: #9ca3af;">
            Saafo Hub &copy; 2026. Todos os direitos reservados.
          </div>
        </div>

        <!-- PAGE 2: QUESTIONS -->
        <div class="page" style="padding-top: 5mm;">
          <h2 style="border-bottom: 2px solid #111827; padding-bottom: 2mm; margin-top: 0; font-size: 16pt;">CADERNO DE QUESTÕES</h2>
          <div class="questions-container">
            ${formattedQuestions}
          </div>
        </div>

        <!-- PAGE 3: BUBBLE SHEET -->
        <div class="page bubble-sheet-page">
          <div class="bubble-sheet-title">FOLHA DE RESPOSTAS (CARTÃO-RESPOSTA)</div>
          <p style="text-align: center; font-size: 10pt; max-width: 120mm; margin-bottom: 8mm; color: #4b5563;">
            Preencha os círculos correspondentes às alternativas escolhidas a caneta. Alinhe esta página adequadamente na câmera do aplicativo para a leitura óptica automática.
          </p>

          <div class="bubble-sheet-container">
            ${bubbleRows}
          </div>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  }

  // ── POST /exams/scanner/grade ─────────────────────────────────────────────
  // Simulates Webcam bubble sheet parsing/grading in development
  @Post('scanner/grade')
  @UseInterceptors(FileInterceptor('file'))
  async gradeWebcamBubbleSheet(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { examId: string },
  ) {
    if (!body.examId) {
      throw new BadRequestException('ID da prova (examId) é obrigatório.');
    }

    const record = await this.prisma.examRecord.findUnique({
      where: { id: body.examId },
    });

    if (!record) {
      throw new NotFoundException(
        'Prova correspondente ao gabarito não encontrada.',
      );
    }

    if (record.userId !== req.user.id) {
      throw new ForbiddenException();
    }

    const questionsList = record.questions as any[];
    const totalQuestions = questionsList.length;

    // Simulate OCR computer vision grading
    // Generate simulated student answers containing 75%-95% correct options (perfect for testing)
    const simulatedAnswers = questionsList.map((q, idx) => {
      const isCorrect = Math.random() < 0.85; // 85% chance of correct answers
      const selectedOptionIdx = isCorrect
        ? q.correctIndex
        : (q.correctIndex + 1) % q.options.length;

      return {
        questionIdx: idx,
        selectedOptionIdx,
        isCorrect,
      };
    });

    const correctCount = simulatedAnswers.filter((a) => a.isCorrect).length;
    const scorePct = Math.round((correctCount / totalQuestions) * 100);

    // Save the graded simulation attempt
    const attempt = await this.prisma.examAttempt.create({
      data: {
        examRecordId: body.examId,
        score: scorePct,
        timeTaken: Math.floor(Math.random() * 1200) + 600, // mock time
      },
    });

    return {
      success: true,
      score: scorePct,
      correctCount,
      totalQuestions,
      attemptId: attempt.id,
      answers: simulatedAnswers.map((a) => ({
        question: a.questionIdx + 1,
        selectedIdx: a.selectedOptionIdx,
        correctIdx: questionsList[a.questionIdx].correctIndex,
        isCorrect: a.isCorrect,
        explanation: questionsList[a.questionIdx].explanation || '',
      })),
    };
  }
}
