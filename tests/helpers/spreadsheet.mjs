// Arquivos XLSX fictícios, gerados em memória; nunca salvam contatos reais.
import { zipSync, strToU8 } from 'fflate';
export function demoSpreadsheet({ formula = false } = {}) {
  const ns = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    rel = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
    xml = (t) => strToU8('<?xml version="1.0" encoding="UTF-8"?>' + t);
  return Buffer.from(
    zipSync({
      '[Content_Types].xml': xml(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
      ),
      '_rels/.rels': xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
      ),
      'xl/workbook.xml': xml(
        `<workbook xmlns="${ns}" xmlns:r="${rel}"><sheets><sheet name="DEMONSTRAÇÃO" sheetId="1" r:id="rId1"/></sheets></workbook>`,
      ),
      'xl/_rels/workbook.xml.rels': xml(
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${rel}/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
      ),
      'xl/worksheets/sheet1.xml': xml(
        `<worksheet xmlns="${ns}"><dimension ref="A1:B2"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>nome</t></is></c><c r="B1" t="inlineStr"><is><t>telefone</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>Cliente XLSX DEMONSTRAÇÃO</t></is></c><c r="B2" t="str">${formula ? '<f>1+1</f>' : ''}<v>11900000003</v></c></row></sheetData></worksheet>`,
      ),
    }),
  );
}
