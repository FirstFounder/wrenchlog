import { and, eq, isNotNull } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import { PDFDocument, PDFPage, PDFFont, StandardFonts, rgb } from 'pdf-lib';
import { db } from '../db/client';
import { clients, invoices, jobs, timeEntries, vehicles } from '../db/schema';
import { HttpError } from './clients';

type InvoiceLineItem = {
  description: string;
  amount: number;
};

const router = Router();
const invoiceDirectory = '/data/invoices';

function formatDate(value: Date): string {
  return value.toLocaleDateString();
}

function formatTime(value: Date): string {
  return value.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} hr ${remainder} min`;
}

function parseLineItems(value: unknown): InvoiceLineItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (typeof item !== 'object' || item === null) {
      return [];
    }

    const description =
      'description' in item && typeof item.description === 'string'
        ? item.description.trim()
        : '';
    const amountValue = 'amount' in item ? item.amount : undefined;
    const amount =
      typeof amountValue === 'number'
        ? amountValue
        : typeof amountValue === 'string'
          ? Number(amountValue)
          : Number.NaN;

    if (!description || !Number.isFinite(amount)) {
      return [];
    }

    return [{ description, amount }];
  });
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
) {
  page.drawText(text, {
    x,
    y,
    size,
    font,
    color: rgb(0.12, 0.12, 0.12),
  });
}

router.post('/generate/:jobId', async (req, res, next) => {
  try {
    const jobId = req.params.jobId;

    const [job] = await db
      .select({
        id: jobs.id,
        title: jobs.title,
        status: jobs.status,
        clientName: clients.name,
        vehicleYear: vehicles.year,
        vehicleMake: vehicles.make,
        vehicleModel: vehicles.model,
        vehicleVin: vehicles.vin,
      })
      .from(jobs)
      .innerJoin(vehicles, eq(jobs.vehicleId, vehicles.id))
      .innerJoin(clients, eq(vehicles.clientId, clients.id))
      .where(eq(jobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new HttpError(404, 'Job not found');
    }

    const entries = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.jobId, jobId), isNotNull(timeEntries.endedAt)));

    const [existingInvoice] = await db
      .select()
      .from(invoices)
      .where(eq(invoices.jobId, jobId))
      .limit(1);
    const lineItems = parseLineItems(existingInvoice?.lineItems);

    const pdf = await PDFDocument.create();
    let page = pdf.addPage([612, 792]);
    const regularFont = await pdf.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdf.embedFont(StandardFonts.HelveticaBold);
    const { width, height } = page.getSize();
    let y = height - 48;

    const ensureSpace = (spaceNeeded: number) => {
      if (y >= 48 + spaceNeeded) {
        return;
      }

      page = pdf.addPage([612, 792]);
      y = height - 48;
    };

    const drawLine = (label: string, value?: string, size = 11) => {
      ensureSpace(size + 8);
      drawText(page, label, 48, y, size, boldFont);
      if (value) {
        drawText(page, value, 180, y, size, regularFont);
      }
      y -= size + 8;
    };

    drawText(page, 'WrenchLog Invoice', 48, y, 22, boldFont);
    const generatedLabel = `Generated ${new Date().toLocaleDateString()}`;
    drawText(
      page,
      generatedLabel,
      width - 48 - regularFont.widthOfTextAtSize(generatedLabel, 11),
      y + 6,
      11,
      regularFont,
    );
    y -= 40;

    drawLine('Client', job.clientName);
    drawLine(
      'Vehicle',
      [job.vehicleYear, job.vehicleMake, job.vehicleModel]
        .filter(Boolean)
        .join(' ') || 'Unknown vehicle',
    );
    if (job.vehicleVin) {
      drawLine('VIN', job.vehicleVin);
    }
    drawLine('Job', job.title);
    drawLine('Status', job.status);
    y -= 12;

    ensureSpace(24);
    drawText(page, 'Labor', 48, y, 16, boldFont);
    y -= 24;
    drawText(page, 'Date', 48, y, 11, boldFont);
    drawText(page, 'Start', 140, y, 11, boldFont);
    drawText(page, 'End', 220, y, 11, boldFont);
    drawText(page, 'Duration', 300, y, 11, boldFont);
    drawText(page, 'Notes', 390, y, 11, boldFont);
    y -= 18;

    let totalLaborMinutes = 0;
    for (const entry of entries) {
      if (!entry.startedAt || !entry.endedAt) {
        continue;
      }

      ensureSpace(18);
      const durationMinutes = Math.round(
        (entry.endedAt.getTime() - entry.startedAt.getTime()) / 60_000,
      );
      totalLaborMinutes += durationMinutes;

      drawText(page, formatDate(entry.startedAt), 48, y, 10, regularFont);
      drawText(page, formatTime(entry.startedAt), 140, y, 10, regularFont);
      drawText(page, formatTime(entry.endedAt), 220, y, 10, regularFont);
      drawText(page, formatDuration(durationMinutes), 300, y, 10, regularFont);
      drawText(page, (entry.notes ?? '').slice(0, 32), 390, y, 10, regularFont);
      y -= 18;
    }

    ensureSpace(20);
    drawText(
      page,
      `Total Labor: ${formatDuration(totalLaborMinutes)}`,
      48,
      y,
      11,
      boldFont,
    );
    y -= 30;

    if (lineItems.length > 0) {
      ensureSpace(24);
      drawText(page, 'Parts & Materials', 48, y, 16, boldFont);
      y -= 24;
      drawText(page, 'Description', 48, y, 11, boldFont);
      drawText(page, 'Amount', 420, y, 11, boldFont);
      y -= 18;

      let subtotal = 0;
      for (const item of lineItems) {
        ensureSpace(18);
        subtotal += item.amount;
        drawText(page, item.description.slice(0, 48), 48, y, 10, regularFont);
        drawText(page, formatCurrency(item.amount), 420, y, 10, regularFont);
        y -= 18;
      }

      ensureSpace(20);
      drawText(
        page,
        `Subtotal: ${formatCurrency(subtotal)}`,
        48,
        y,
        11,
        boldFont,
      );
      y -= 30;
    }

    drawText(page, 'Generated by WrenchLog', 48, 32, 10, regularFont);

    await fs.mkdir(invoiceDirectory, { recursive: true });
    const pdfPath = path.join(invoiceDirectory, `${jobId}.pdf`);
    const pdfBytes = await pdf.save();
    await fs.writeFile(pdfPath, pdfBytes);

    const now = new Date();
    let invoiceId: string;

    if (existingInvoice) {
      const [updatedInvoice] = await db
        .update(invoices)
        .set({
          issuedAt: now,
          pdfPath,
          updatedAt: now,
        })
        .where(eq(invoices.id, existingInvoice.id))
        .returning({ id: invoices.id });

      invoiceId = updatedInvoice.id;
    } else {
      const [createdInvoice] = await db
        .insert(invoices)
        .values({
          jobId,
          issuedAt: now,
          pdfPath,
          lineItems: [],
        })
        .returning({ id: invoices.id });

      invoiceId = createdInvoice.id;
    }

    res.status(201).json({
      data: {
        invoiceId,
        downloadUrl: `/api/invoices/${jobId}/download`,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:jobId/download', async (req, res, next) => {
  try {
    const [invoice] = await db
      .select({
        pdfPath: invoices.pdfPath,
      })
      .from(invoices)
      .where(eq(invoices.jobId, req.params.jobId))
      .limit(1);

    if (!invoice?.pdfPath) {
      throw new HttpError(404, 'Invoice not found');
    }

    res.type('application/pdf');
    res.sendFile(invoice.pdfPath);
  } catch (error) {
    next(error);
  }
});

export default router;
