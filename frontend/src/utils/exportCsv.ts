/**
 * 대시보드 내 데이터를 CSV/엑셀 파일로 100% 호환 가능하게 다운로드하는 유틸리티
 * Data URI + BOM(\uFEFF) 방식을 적용하여 macOS/Windows Chrome/Safari 등 모든 브라우저에서 차단 없이 저장됩니다.
 */

export function exportToCsv<T extends Record<string, any>>(filename: string, data: T[]) {
  if (!data || data.length === 0) {
    alert('다운로드할 데이터가 없습니다.');
    return;
  }

  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];
  
  // 헤더
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));
  
  // 데이터 행
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
      val = String(val).replace(/\r?\n/g, ' ').replace(/"/g, '""');
      return `"${val}"`;
    });
    csvRows.push(values.join(','));
  }

  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  
  // Data URI 생성
  const encodedUri = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  
  link.click();
  document.body.removeChild(link);
}
