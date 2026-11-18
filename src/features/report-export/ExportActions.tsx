import { useRef, useState } from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { Button } from '../../components/Button';
import type { ExportTable } from '../../../shared/report-export';
import { api, civilDate } from '../api';
import { Failure } from '../operations/common';
import { downloadBlob, privateDownload } from '../PrivateDownload';

type Format = 'xlsx' | 'pdf' | 'csv';
type Props = {
  path: string;
  csvName: string;
  slug: string;
  title: string;
  from: string;
  to: string;
  filters?: string;
};

export function ExportActions(props: Props) {
  const [busy, setBusy] = useState<Format | null>(null);
  const [shareFile, setShareFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const running = useRef(false);

  async function share(file: File) {
    setShareFile(null);
    try {
      await navigator.share({ files: [file], title: props.title });
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError'))
        downloadBlob(file, file.name);
    }
  }

  async function generate(format: Format) {
    if (running.current) return;
    running.current = true;
    setBusy(format);
    setError('');
    setShareFile(null);
    try {
      const { path, from, to, title, filters, slug } = props;
      if (format === 'csv') {
        await privateDownload(path + '&format=csv', props.csvName);
        return;
      }
      const name = `relatorio-${slug}-${from.slice(0, 7)}.${format}`;
      const data = api<ExportTable>(path + '&format=json');
      if (format === 'xlsx') {
        const [table, { createSpreadsheet }] = await Promise.all([
          data,
          import('./report-spreadsheet'),
        ]);
        downloadBlob(await createSpreadsheet(table, title), name);
        return;
      }
      const [table, pdf] = await Promise.all([data, import('./report-pdf')]);
      const period = `Período: ${civilDate(from)} a ${civilDate(to)}`;
      const blob = await pdf.createReportPdf(
        table,
        { title, period, filters },
        await pdf.loadPdfAssets(),
      );
      const file = new File([blob], name, { type: blob.type });
      if (
        window.matchMedia('(pointer: coarse)').matches &&
        navigator.canShare?.({ files: [file] })
      ) {
        if (navigator.userActivation?.isActive) await share(file);
        else setShareFile(file);
      } else downloadBlob(file, name);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '';
      setError(
        message
          ? `Não foi possível exportar. ${message}`
          : 'Não foi possível exportar.',
      );
    } finally {
      setBusy(null);
      running.current = false;
    }
  }

  return (
    <div className="report-export">
      <div
        className="report-export-actions"
        role="group"
        aria-label="Formatos de exportação"
      >
        <Button
          type="button"
          variant="primary"
          icon={<FileSpreadsheet size={20} />}
          disabled={busy !== null}
          loading={busy === 'xlsx'}
          onClick={() => void generate('xlsx')}
        >
          Planilha
        </Button>
        <Button
          type="button"
          variant="tonal"
          icon={<FileText size={20} />}
          disabled={busy !== null}
          loading={busy === 'pdf'}
          onClick={() => void generate('pdf')}
        >
          PDF
        </Button>
      </div>
      <Button
        type="button"
        variant="ghost"
        className="report-export-csv"
        disabled={busy !== null}
        loading={busy === 'csv'}
        onClick={() => void generate('csv')}
      >
        Outros formatos (CSV)
      </Button>
      {shareFile && (
        <div
          className="report-export-actions"
          role="group"
          aria-label="PDF pronto"
        >
          <Button
            type="button"
            variant="primary"
            onClick={() => void share(shareFile)}
          >
            Compartilhar PDF
          </Button>
          <Button
            type="button"
            variant="tonal"
            onClick={() => {
              downloadBlob(shareFile, shareFile.name);
              setShareFile(null);
            }}
          >
            Baixar PDF
          </Button>
        </div>
      )}
      <Failure message={error} />
    </div>
  );
}
