import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';

const app = express();

// ==== ENV ====
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;

// ==== Sheets ====
const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // Hardcode luôn
const sheets = google.sheets('v4');
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
} catch (err) {
  console.error('❌ Lỗi parse GOOGLE_CREDENTIALS:', err);
  credentials = {};
}
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

// ==== Discord Client ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: ['CHANNEL']
});

client.once('ready', () => {
  console.log(`✅ Bot đã online với tên ${client.user.tag}`);
});

// ==== Prefix Command ====
client.on('messageCreate', async message => {
  if (message.author.bot) return;
  if (message.content === '!ping') return message.reply('🏓 Pong!');
  if (message.content === '!ace') return handleAceCommand(message.author, reply => message.reply(reply));
});

// ==== Slash Command Interaction ====
app.post('/interactions', express.json(), async (req, res) => {
  const interaction = req.body;
  if (interaction.type === 1) {
    // Ping interaction (healthcheck)
    return res.json({ type: 1 });
  }

  if (interaction.type === 2) {
    const { name } = interaction.data;
    if (name === 'ping') {
      return res.json({
        type: 4,
        data: { content: '🏓 Pong!' }
      });
    }
    if (name === 'ace') {
      const userId = interaction.member?.user?.id || interaction.user?.id;
      const reply = await handleAceCommandById(userId);
      return res.json({
        type: 4,
        data: { content: reply }
      });
    }
  }
  return res.sendStatus(400);
});

// ==== Xử lý ACE Command ====
async function handleAceCommand(user, replyFunc) {
  try {
    const sheetsClient = await auth.getClient();
    const rangeHeader = `'Tổng hợp xử lý khen thưởng'!A1:Z2`;
    const resHeader = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeHeader
    });

    const [headers, discordIds] = resHeader.data.values;
    const index = discordIds.indexOf(user.id);
    if (index === -1) {
      replyFunc(`❌ Không tìm thấy Discord ID của bạn.`);
      return;
    }

    const tenNhanSu = headers[index];
    const colLetter = String.fromCharCode(65 + index);
    const rangeData = `'Tổng hợp xử lý khen thưởng'!${colLetter}3:${colLetter}7`;
    const resData = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeData
    });

    const diemHienTai = resData.data.values[0]?.[0] || "0";
    const soThang = resData.data.values[3]?.[0] || "0";
    const tongDiem6Thang = resData.data.values[4]?.[0] || "0";

    const msg = `📊 Thông tin ACE của **${tenNhanSu}**:\n` +
      `• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n` +
      `• Số tháng làm việc: **${soThang}** tháng\n` +
      `• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm`;

    replyFunc(msg);
  } catch (err) {
    console.error('❌ Lỗi tra cứu ACE:', err);
    replyFunc(`❌ Lỗi tra cứu ACE: ${err.message}`);
  }
}

async function handleAceCommandById(userId) {
  try {
    const sheetsClient = await auth.getClient();
    const rangeHeader = `'Tổng hợp xử lý khen thưởng'!A1:Z2`;
    const resHeader = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeHeader
    });

    const [headers, discordIds] = resHeader.data.values;
    const index = discordIds.indexOf(userId);
    if (index === -1) return `❌ Không tìm thấy Discord ID của bạn.`;

    const tenNhanSu = headers[index];
    const colLetter = String.fromCharCode(65 + index);
    const rangeData = `'Tổng hợp xử lý khen thưởng'!${colLetter}3:${colLetter}7`;
    const resData = await sheets.spreadsheets.values.get({
      auth: sheetsClient,
      spreadsheetId: sheetId,
      range: rangeData
    });

    const diemHienTai = resData.data.values[0]?.[0] || "0";
    const soThang = resData.data.values[3]?.[0] || "0";
    const tongDiem6Thang = resData.data.values[4]?.[0] || "0";

    const msg = `📊 Thông tin ACE của **${tenNhanSu}**:\n` +
      `• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n` +
      `• Số tháng làm việc: **${soThang}** tháng\n` +
      `• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm`;

    return msg;
  } catch (err) {
    console.error('❌ Lỗi tra cứu ACE:', err);
    return `❌ Lỗi tra cứu ACE: ${err.message}`;
  }
}

// ==== Webhook /send_dm ====
app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ success: false, error: 'Thiếu userId hoặc content' });
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

// ==== Webhook /send_channel ====
app.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Thiếu channelId hoặc content' });
  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ content, allowedMentions: { parse: ['users'] } });
    console.log(`✅ Đã gửi tin nhắn tới channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi tới channel ${channel.name}` });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==== App listen ====
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy ở port ${PORT}`));
client.login(token);
