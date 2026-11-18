import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { ExportTable } from '../../../shared/report-export';
import { chocolate, cream, displayCell, totals } from './table';
import figtreeUrl from './assets/figtree.ttf?url';
import boldUrl from './assets/figtree-bold.ttf?url';
import serifUrl from './assets/dm-serif-display.ttf?url';
import logoUrl from './assets/report-logo.png?url';

export type PdfAssets = {
  regular: ArrayBuffer;
  bold: ArrayBuffer;
  serif: ArrayBuffer;
  logo: ArrayBuffer;
};

export type PdfDetails = { title: string; period: string; filters?: string };

export async function loadPdfAssets(): Promise<PdfAssets> {
  async function asset(url: string) {
    const response = await fetch(url);
    if (!response.ok)
      throw new Error('Não foi possível carregar a identidade visual do PDF.');
    return response.arrayBuffer();
  }
  const [regular, bold, serif, logo] = await Promise.all(
    [figtreeUrl, boldUrl, serifUrl, logoUrl].map(asset),
  );
  return { regular, bold, serif, logo };
}

function color(hex: string) {
  return rgb(
    ...([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
      number,
      number,
      number,
    ]),
  );
}

const ink = color(chocolate);
const paper = color(cream);
const stripe = color('#FBF5EB');
const rule = color('#E0CFB7');
const muted = color('#665144');
const margin = 42;
const lineHeight = 13;
const size = 9;

function wrap(text: string, width: number, font: PDFFont, fontSize: number) {
  const lines: string[] = [];
  let line = '';
  for (const word of text.normalize('NFC').trim().split(/\s+/u)) {
    const candidate = line ? line + ' ' + word : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= width) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (line && font.widthOfTextAtSize(line + char, fontSize) > width) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  lines.push(line);
  return lines;
}

export async function createReportPdf(
  table: ExportTable,
  details: PdfDetails,
  assets: PdfAssets,
  generatedAt = new Date(),
) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [regular, bold, serif, logo] = await Promise.all([
    doc.embedFont(assets.regular, { subset: true }),
    doc.embedFont(assets.bold, { subset: true }),
    doc.embedFont(assets.serif, { subset: true }),
    doc.embedPng(assets.logo),
  ]);
  doc.setTitle(details.title);
  const [width, height] = table.columns.length > 6 ? [842, 595] : [595, 842];
  const content = width - 2 * margin;
  const weights = table.columns.map((col) =>
    col.type === 'money' ? 1.2 : col.type ? 0.92 : 1.75,
  );
  const weight = weights.reduce((total, value) => total + value, 0);
  const widths = weights.map((value) => (content * value) / weight);
  const total = totals(table);
  const summary = [
    ...table.columns
      .map((column, i) => ({ column, value: total[i] }))
      .filter(({ value }) => value !== null)
      .sort(
        (a, b) =>
          Number(b.column.type === 'money') - Number(a.column.type === 'money'),
      )
      .map(({ column, value }) => ({
        label: column.label,
        text: displayCell(value, column),
      })),
    ...(table.summary ?? []).map((item) => ({
      label: item.label,
      text: displayCell(item.value, item),
    })),
  ];
  if (!summary.length)
    summary.push({ label: 'Clientes', text: String(table.rows.length) });

  let page: PDFPage;
  let y: number;
  const headers = table.columns.map((col) => col.label);

  function tableRow(
    values: string[],
    style: 'header' | 'total' | 'striped' | 'plain',
  ) {
    const font = style === 'header' || style === 'total' ? bold : regular;
    const texts = values.map((text, i) =>
      wrap(text, widths[i] - 12, font, size),
    );
    const count = Math.max(...texts.map((lines) => lines.length));
    let start = 0;
    while (start < count) {
      const available = Math.floor((y - 52 - 8) / lineHeight);
      if (available < 1) {
        beginPage(false);
        continue;
      }
      const chunk = Math.min(available, count - start);
      const rowHeight = chunk * lineHeight + 8;
      const fill =
        style === 'header' ? ink : style === 'total' ? paper : stripe;
      if (style !== 'plain')
        page.drawRectangle({
          x: margin,
          y: y - rowHeight,
          width: content,
          height: rowHeight,
          color: fill,
        });
      if (style === 'total' && start === 0)
        page.drawLine({
          start: { x: margin, y },
          end: { x: width - margin, y },
          thickness: 1.5,
          color: ink,
        });
      let x = margin;
      for (const [i, lines] of texts.entries()) {
        for (const [lineIndex, text] of lines
          .slice(start, start + chunk)
          .entries()) {
          const alignRight = ['number', 'money'].includes(
            table.columns[i].type ?? '',
          );
          const offset = alignRight
            ? widths[i] - 6 - font.widthOfTextAtSize(text, size)
            : 6;
          page.drawText(text, {
            x: x + offset,
            y: y - 6 - size - lineIndex * lineHeight,
            size,
            font,
            color: style === 'header' ? paper : ink,
          });
        }
        x += widths[i];
      }
      y -= rowHeight;
      page.drawLine({
        start: { x: margin, y },
        end: { x: width - margin, y },
        color: rule,
        thickness: 0.5,
      });
      start += chunk;
    }
  }

  function beginPage(first: boolean) {
    page = doc.addPage([width, height]);
    const brand = logo.scaleToFit(54, 54);
    page.drawImage(logo, {
      x: margin,
      y: height - margin - brand.height,
      ...brand,
    });
    const x = margin + 66;
    let top = height - margin - 20;
    for (const line of wrap(details.title, content - 66, serif, 23)) {
      page.drawText(line, { x, y: top, font: serif, size: 23, color: ink });
      top -= 26;
    }
    const caption = [details.period, details.filters]
      .filter(Boolean)
      .join(' · ');
    for (const line of wrap(caption, content - 66, regular, 10)) {
      page.drawText(line, {
        x,
        y: top + 6,
        font: regular,
        size: 10,
        color: muted,
      });
      top -= 13;
    }
    y = Math.min(top, height - margin - 60);
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      color: color('#B8915B'),
      thickness: 2,
    });
    y -= 16;
    if (first) {
      for (let i = 0; i < summary.length; i += 3) {
        const cards = summary.slice(i, i + 3);
        const cardWidth = (content - 16) / 3;
        const labels = cards.map((card) =>
          wrap(card.label, cardWidth - 16, regular, 9),
        );
        const cardHeight =
          31 + Math.max(...labels.map((lines) => lines.length)) * 11;
        for (const [j, card] of cards.entries()) {
          const cardX = margin + j * (cardWidth + 8);
          const r = 8;
          const w = cardWidth;
          const h = cardHeight;
          const cardPath = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
          page.drawSvgPath(cardPath, { x: cardX, y, color: paper });
          labels[j].forEach((text, index) =>
            page.drawText(text, {
              x: cardX + 8,
              y: y - 15 - index * 11,
              size: 9,
              font: regular,
              color: ink,
            }),
          );
          page.drawText(card.text, {
            x: cardX + 8,
            y: y - cardHeight + 9,
            size: 13,
            font: bold,
            color: ink,
          });
        }
        y -= cardHeight + 8;
      }
      y -= 4;
    }
    tableRow(headers, 'header');
  }

  beginPage(true);
  for (const [index, row] of table.rows.entries()) {
    tableRow(
      row.map((value, i) => displayCell(value, table.columns[i])),
      index % 2 ? 'plain' : 'striped',
    );
  }
  tableRow(
    total.map((value, i) =>
      i === 0 ? 'Total' : displayCell(value, table.columns[i]),
    ),
    'total',
  );

  const date = generatedAt.toLocaleDateString('pt-BR');
  const time = generatedAt.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const pages = doc.getPages();
  for (const [index, outputPage] of pages.entries()) {
    const footer = `Gerado em ${date} ${time} · página ${index + 1} de ${pages.length}`;
    outputPage.drawText('Brigaderia Amor Zeloso · Gestão', {
      x: margin,
      y: 27,
      font: regular,
      size: 8,
      color: muted,
    });
    outputPage.drawText(footer, {
      x: width - margin - regular.widthOfTextAtSize(footer, 8),
      y: 27,
      font: regular,
      size: 8,
      color: muted,
    });
  }
  return new Blob([Uint8Array.from(await doc.save())], {
    type: 'application/pdf',
  });
}
