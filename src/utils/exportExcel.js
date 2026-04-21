import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import XLSX from 'xlsx';

export async function exportEventToExcel(event) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Event info
  const infoData = [
    ['Evento', event.name],
    ['Fecha', event.date],
    ['Total preguntas', event.questions.length],
  ];
  const wsInfo = XLSX.utils.aoa_to_sheet(infoData);
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Información');

  // One sheet per question
  event.questions.forEach((q, idx) => {
    const rows = [['Opción', 'Votos']];
    q.options.forEach((opt, i) => {
      rows.push([opt, q.votes[i] ?? 0]);
    });
    const total = q.votes.reduce((a, b) => a + b, 0);
    rows.push(['TOTAL', total]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    const sheetName = `P${idx + 1}`.substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Write to a temp file
  const binaryStr = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const safeName = event.name.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
  const fileUri = FileSystem.cacheDirectory + `${safeName}_${Date.now()}.xlsx`;

  await FileSystem.writeAsStringAsync(fileUri, binaryStr, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Resultados: ${event.name}`,
    });
  } else {
    throw new Error('Compartir no disponible en este dispositivo');
  }
}
