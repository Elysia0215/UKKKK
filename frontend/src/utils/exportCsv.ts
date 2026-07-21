/**
 * 대시보드 내 데이터를 CSV/엑셀 파일로 깨짐 없이 다운로드하는 유틸리티
 * 1. UTF-8 BOM(\uFEFF)을 추가하여 엑셀(Excel)에서 열 때 한국어 한글 깨짐 방지
 * 2. 줄바꿈(\n, \r) 문자를 이스케이프 처리하여 CSV 셀 붕괴 방지
 * 3. Chrome/Safari/Edge 등에서 .csv 확장자로 깔끔하게 저장되도록 최적화
 */

export function exportToCsv<T extends Record<string, any>>(filename: string, data: T[]) {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  // 헤더 생성
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
  
  // 데이터 행 생성
  for (const row of data) {
    const values = headers.map(header => {
      let val = row[header];
      if (val === null || val === undefined) {
        val = '';
      } else if (Array.isArray(val)) {
        val = val.join('; ');
      } else if (typeof val === 'object') {
        val = JSON.stringify(val);
      }
      // 줄바꿈 문자를 공백으로 변환하고 큰따옴표 이스케이프
      val = String(val).replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  }

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
