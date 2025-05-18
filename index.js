import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import nacl from 'tweetnacl';
import fetch from 'node-fetch';

const app = express();

// 👉 Google Sheets API setup
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
} catch (err) {
  console.error('❌ Lỗi parse credentials:', err);
  credentials = {};
}

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // ACE điểm thưởng
const sheetIdDuyetDon = '19_GVd7JHsO4BOgXfCDy60VLzJJBqyJs7D6u9d7o3GFw'; // Sheet ID hệ thống duyệt đơn riêng biệt

// ✅ Khởi tạo bot
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: ['CHANNEL']
});
const token = process.env.DISCORD_TOKEN;

// ✅ Webhook xử lý interaction (slash command)
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';

app.post('/interactions', async (req, res) => {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + req.rawBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(PUBLIC_KEY, 'hex')
  );

  if (!isVerified) return res.status(401).send('Invalid request signature');

  const interaction = req.body;
  if (interaction.type === 1) return res.send({ type: 1 });

  if (interaction.type === 2) {
    const { name, options } = interaction.data;
    const userId = interaction.member?.user?.id || interaction.user?.id;

    if (name === 'ping') {
      return res.json({ type: 4, data: { content: '🏓 Pong!' } });
    }

    if (name === 'ace') {
      const reply = await handleAceCommandById(userId);
      return res.json({ type: 4, data: { content: reply } });
    }

    if (name === 'ma') {
      const maCode = options?.[0]?.value;
      if (!maCode) {
        return res.json({ type: 4, data: { content: '❌ Bạn cần nhập mã lỗi sau lệnh.' } });
      }
      const reply = await traCuuMaLoi(maCode);
      return res.json({ type: 4, data: { content: reply } });
    }

    if (name === 'duyet' || name === 'tuchoi') {
      const id = options?.[0]?.value;
      const payload = {
        action: name,
        id,
        discordUserId: userId
      };
      try {
        const r = await fetch(WEBAPP_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { 'Content-Type': 'application/json' }
        });
        const reply = await r.text();
        return res.json({ type: 4, data: { content: reply } });
      } catch (err) {
        console.error(`❌ Lỗi gọi webhook /${name}:`, err);
        return res.json({ type: 4, data: { content: '❌ Gặp lỗi khi xử lý lệnh.' } });
      }
    }
  }
});

// ✅ Hàm tra cứu mã lỗi
async function traCuuMaLoi(maCode) {
  try {
    const clientAuth = await auth.getClient();
    const range = 'Danh sách mã tham chiếu!A:B';
    const res = await sheets.spreadsheets.values.get({
      auth: clientAuth,
      spreadsheetId: sheetId,
      range
    });
    const rows = res.data.values;
    if (!rows || rows.length === 0) return `❌ Không tìm thấy mã **${maCode}**.`;
    for (const row of rows) {
      if (row[0]?.toUpperCase() === maCode.toUpperCase()) {
        return `📄 Mã **${maCode.toUpperCase()}**: ${row[1] || '(Không có mô tả)'}`;
      }
    }
    return `❌ Không tìm thấy mã **${maCode}**.`;
  } catch (err) {
    console.error('❌ Lỗi tra cứu mã:', err);
    return `❌ Lỗi tra cứu mã: ${err.message}`;
  }
}

// ✅ Hàm ACE info
async function handleAceCommandById(discordId) {
  try {
    const sheetsClient = await auth.getClient();
    const sheetKhenThuong = 'Tổng hợp xử lý khen thưởng';
    const rangeHeader = `'${sheetKhenThuong}'!A1:Z2`;
    const resHeader = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeHeader
    });
    const [headers, discordIds] = resHeader.data.values;
    const index = discordIds.indexOf(discordId);
    if (index === -1) return `❌ Không tìm thấy Discord ID của bạn.`;

    const tenNhanSu = headers[index];
    const colLetter = String.fromCharCode(65 + index);
    const rangeData = `'${sheetKhenThuong}'!${colLetter}3:${colLetter}7`;
    const resData = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeData
    });

    const diemHienTai = resData.data.values[0]?.[0] || "0";
    const soThang = resData.data.values[3]?.[0] || "0";
    const tongDiem6Thang = resData.data.values[4]?.[0] || "0";

    return `📊 Thông tin ACE của **${tenNhanSu}**:\n` +
      `• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n` +
      `• Số tháng làm việc: **${soThang}** tháng\n` +
      `• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm`;
  } catch (err) {
    console.error('❌ Lỗi tra cứu ACE:', err);
    return `❌ Có lỗi xảy ra khi tra cứu ACE: ${err.message}`;
  }
}

// ✅ Webhook send_dm
app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ success: false, error: 'Missing userId or content' });
  try {
    const user = await client.users.fetch(userId);
    await user.send({ content, allowedMentions: { parse: [] } });
    console.log(`✅ Đã gửi DM cho ${user.tag}`);
    res.json({ success: true, message: `Đã gửi DM cho ${user.tag}` });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({ success: false, error: err.message, userId });
  }
});

// ✅ Webhook send_channel
app.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ success: false, error: `Channel ${channelId} not found` });
    const sentMessage = await channel.send({ content, allowedMentions: { parse: ['users'] } });
    console.log(`✅ Đã gửi tin nhắn channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi channel ${channel.name}`, messageId: sentMessage.id });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start app & bot
app.get('/', (req, res) => res.send('Bot server is running!'));
app.get('/ping', (req, res) => res.send('Pong! Bot is alive.'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy ở port ${PORT}`));

client.login(token);
