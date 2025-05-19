import db from '../database.js';

export async function getRange(spreadsheetId, range) {
  const client = await db.auth.getClient();
  const res = await db.sheets.spreadsheets.values.get({
    auth: client,
    spreadsheetId,
    range
  });
  return res.data.values || [];
}

// tra cứu mã lỗi
export async function lookupCode(maCode) {
  const rows = await getRange(
    config.GOOGLE.SHEET_IDS.ACE,
    'Danh sách mã tham chiếu!A:B'
  );
  const row = rows.find(r => r[0]?.toUpperCase() === maCode.toUpperCase());
  return row?.[1] || null;
}

// lấy ACE info
export async function getAceByDiscordId(discordId) {
  const sheetId = config.GOOGLE.SHEET_IDS.ACE;
  const tab = 'Tổng hợp xử lý khen thưởng';
  const header = await getRange(sheetId, `'${tab}'!A1:Z2`);
  const [keys, ids] = header;
  const idx = ids.indexOf(discordId);
  if (idx < 0) return null;
  const col = String.fromCharCode(65 + idx);
  const data = await getRange(sheetId, `'${tab}'!${col}3:${col}7`);
  return {
    ten: keys[idx],
    diem: data[0]?.[0] || '0',
    thang: data[3]?.[0] || '0',
    tong6thang: data[4]?.[0] || '0'
  };
}
