// ✅ Full code with bug fix for /ace (handle undefined data)

import { Client, GatewayIntentBits, Routes } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';
import { REST } from '@discordjs/rest';

const app = express();
app.use(express.json());

const token = process.env.DISCORD_TOKEN;
const publicKey = process.env.DISCORD_PUBLIC_KEY;
const applicationId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages
  ]
});

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30';
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

// ✅ Register slash commands
const commands = [
  { name: 'ping', description: 'Kiểm tra bot sống không' },
  { name: 'ma', description: 'Tra cứu mã lỗi/thưởng', options: [{ name: 'code', type: 3, required: true, description: 'Nhập mã' }] },
  { name: 'ace', description: 'Xem điểm ACE của bạn' }
];

const rest = new REST({ version: '10' }).setToken(token);
(async () => {
  try {
    console.log('🔄 Đăng ký slash command...');
    await rest.put(Routes.applicationGuildCommands(applicationId, guildId), { body: commands });
    console.log('✅ Đăng ký slash command thành công');
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash command:', err);
  }
})();

// ✅ Handle slash commands
app.post('/interactions', async (req, res) => {
  const interaction = req.body;

  if (interaction.type === 1) return res.send({ type: 1 });

  if (interaction.type !== 2) return res.send({});

  const { name, options, user } = interaction.data;
  const memberUser = interaction.member?.user || interaction.user; // ✅ Fix here

  if (name === 'ping') {
    return res.send({ type: 4, data: { content: 'Pong! 🏓' } });
  }

  if (name === 'ma') {
    const code = options[0].value.toUpperCase();
    try {
      const clientAuth = await auth.getClient();
      const result = await sheets.spreadsheets.values.get({
        auth: clientAuth,
        spreadsheetId: sheetId,
        range: 'Danh sách mã tham chiếu!A:B'
      });
      const rows = result.data.values;
      const found = rows?.find(row => row[0]?.toUpperCase() === code);
      if (found) {
        res.send({ type: 4, data: { content: `📄 Mã **${code}**: ${found[1]}` } });
      } else {
        res.send({ type: 4, data: { content: `❌ Không tìm thấy mã **${code}** trong danh sách.` } });
      }
    } catch (err) {
      console.error('❌ Lỗi tra cứu mã:', err);
      res.send({ type: 4, data: { content: `❌ Lỗi khi tra cứu: ${err.message}` } });
    }
  }

  if (name === 'ace') {
    try {
      const discordId = memberUser.id;
      const sheetKhenThuong = 'Tổng hợp xử lý khen thưởng';
      const clientAuth = await auth.getClient();
      const resHeader = await sheets.spreadsheets.values.get({
        auth: clientAuth,
        spreadsheetId: sheetId,
        range: `'${sheetKhenThuong}'!A1:Z2`
      });

      const [headers, discordIds] = resHeader.data.values || [[], []];
      const index = discordIds.indexOf(discordId);
      if (index === -1) {
        return res.send({ type: 4, data: { content: '❌ Không tìm thấy Discord ID của bạn.' } });
      }

      const tenNhanSu = headers[index];
      const colLetter = String.fromCharCode(65 + index);
      const resData = await sheets.spreadsheets.values.get({
        auth: clientAuth,
        spreadsheetId: sheetId,
        range: `'${sheetKhenThuong}'!${colLetter}3:${colLetter}7`
      });

      const diemHienTai = resData.data.values?.[0]?.[0] || '0';
      const soThang = resData.data.values?.[3]?.[0] || '0';
      const tongDiem6Thang = resData.data.values?.[4]?.[0] || '0';

      const msg = `📊 Thông tin ACE của **${tenNhanSu}**:\n• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n• Số tháng làm việc: **${soThang}** tháng\n• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm`;

      return res.send({ type: 4, data: { content: msg } });
    } catch (err) {
      console.error('❌ Lỗi xử lý /ace:', err);
      return res.send({ type: 4, data: { content: `❌ Lỗi khi tra cứu ACE: ${err.message}` } });
    }
  }
});

// ✅ Keep send_dm + send_channel
app.post('/send_dm', async (req, res) => { ... }); // giữ nguyên code cũ

app.post('/send_channel', async (req, res) => { ... }); // giữ nguyên code cũ

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));
