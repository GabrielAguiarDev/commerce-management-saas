import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { createXlsx } from '@utils/xlsx';

import { reportFileName, reportHtml, reportSheets } from './reportsExport';
import type { Report } from './reportsTypes';

/**
 * GERAR E COMPARTILHAR o relatório.
 *
 * ⚠️ ÚNICO ARQUIVO DO DOMÍNIO QUE TOCA NO APARELHO — arquivo, impressão e a
 * folha de compartilhamento. O que decide o CONTEÚDO é `reportsExport`, que é
 * puro e testado.
 *
 * ┌─ POR QUE CACHE, E NÃO A PASTA DE DOCUMENTOS ───────────────────────────┐
 * │ O relatório é descartável: ele existe para ser mandado no WhatsApp ou   │
 * │ no e-mail e nunca mais. Em `document` ele ficaria ocupando espaço para  │
 * │ sempre, sem tela nenhuma no app para listá-lo ou apagá-lo. Em `cache` o │
 * │ sistema recolhe sozinho quando o aparelho apertar.                      │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * ┌─ O ARQUIVO É RENOMEADO ANTES DE COMPARTILHAR ──────────────────────────┐
 * │ O `printToFileAsync` grava com um nome aleatório do sistema. Quem       │
 * │ recebesse o anexo veria `8A3F-01C2.pdf` e não saberia o que abriu. O    │
 * │ nome é a única legenda que sobrevive à viagem pelo WhatsApp.            │
 * └────────────────────────────────────────────────────────────────────────┘
 */

export type ShareResult = { ok: true } | { ok: false; reason: 'unavailable' | 'failed' };

/**
 * Existe para onde mandar?
 *
 * No simulador do iOS e em alguns Android sem app de compartilhamento a folha
 * simplesmente não abre. Perguntar antes deixa a tela dizer isso, em vez de a
 * pessoa tocar no botão e nada acontecer.
 */
async function compartilhar(uri: string, mime: string, titulo: string): Promise<ShareResult> {
  if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };

  await Sharing.shareAsync(uri, {
    mimeType: mime,
    dialogTitle: titulo,
    // Só o iOS usa. É o que faz o "Salvar em Arquivos" e o "Copiar para o
    // Excel" aparecerem na folha, em vez de só os apps de mensagem.
    UTI: mime === 'application/pdf' ? 'com.adobe.pdf' : 'org.openxmlformats.spreadsheetml.sheet',
  });

  return { ok: true };
}

/** Um arquivo do cache com este nome, sempre limpo antes de escrever. */
function arquivoNovo(nome: string): File {
  const file = new File(Paths.cache, nome);
  // Sobrescrever é o certo: gerar o relatório do mesmo período duas vezes no
  // mesmo dia produz o mesmo nome, e a segunda vez tem de valer.
  file.create({ overwrite: true, intermediates: true });
  return file;
}

export async function shareReportPdf(report: Report, periodLabel: string): Promise<ShareResult> {
  try {
    const { uri } = await Print.printToFileAsync({ html: reportHtml(report, periodLabel) });

    const destino = new File(Paths.cache, reportFileName(periodLabel, 'pdf'));
    if (destino.exists) destino.delete();
    new File(uri).move(destino);

    return await compartilhar(destino.uri, 'application/pdf', 'Enviar relatório em PDF');
  } catch {
    return { ok: false, reason: 'failed' };
  }
}

export async function shareReportXlsx(report: Report, periodLabel: string): Promise<ShareResult> {
  try {
    const file = arquivoNovo(reportFileName(periodLabel, 'xlsx'));
    file.write(createXlsx(reportSheets(report, periodLabel)));

    return await compartilhar(
      file.uri,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Enviar a planilha',
    );
  } catch {
    return { ok: false, reason: 'failed' };
  }
}
