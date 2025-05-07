import { Client, GatewayIntentBits, Routes, REST } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import nacl from 'tweetnacl';

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// 👉 Google Sheets setup
let credentials;
try {
  credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS || '{}');
} catch (err) {
  console.error('❌ Lỗi parse GOOGLE_CREDENTIALS:', err);
  credentials = {};
}

const sheets = google.sheets('v4');
const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30';
const range = 'Danh sách mã tham chiếu!A:B';

const token = process.env.DISCORD_TOKEN;
const publicKey = process.env.DISCORD_PUBLIC_KEY;
const appId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 👉 Đăng ký slash command tự động
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
  try {
    console.log('🚀 Đăng ký slash command...');
    await rest.put(
      Routes.applicationGuildCommands(appId, guildId),
      { body: [
        {
          name: 'ping',
          description: 'Kiểm tra bot hoạt động',
        },
        {
          name: 'ma',
          description: 'Tra cứu mã ACE',
          options: [
            {
              name: 'code',
              type: 3, // STRING
              description: 'Mã cần tra cứu',
              required: true
            }
          ]
        },
        {
          name: 'ace',
          description: 'Xem thông tin ACE của bạn',
        }
      ] }
    );
    console.log('✅ Slash command đã đăng ký!');
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash command:', err);
  }
})();

// 👉 Xác minh chữ ký request
function verifyRequest(req) {
  const signature = req.header('X-Signature-Ed25519');
  const timestamp = req.header('X-Signature-Timestamp');
  const rawBody = req.rawBody;

  if (!signature || !timestamp) return false;

  return nacl.sign.detached.verify(
    Buffer.from(timestamp + rawBody),
    Buffer.from(signature, 'hex'),
    Buffer.from(publicKey, 'hex')
  );
}

// 👉 Hàm tra cứu mã
async function traCuuMa(maCode) {
  const clientAuth = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: clientAuth,
    spreadsheetId: sheetId,
    range: range
  });

  const rows = res.data.values;
  if (!rows || rows.length === 0) return null;

  for (const row of rows) {
    if (row[0]?.toUpperCase() === maCode.toUpperCase()) {
      return row[1] || '(Không có nội dung mô tả)';
    }
  }
  return null;
}

// 👉 /interactions endpoint
app.post('/interactions', async (req, res) => {
  if (!verifyRequest(req)) {
    return res.status(401).send('invalid request signature');
  }

  const interaction = req.body;

  if (interaction.type === 1) {
    return res.send({ type: 1 });
  }

  if (interaction.type === 2) {
    const { name, options, member } = interaction.data;

    if (name === 'ping') {
      return res.send({ type: 4, data: { content: 'Pong! 🏓' } });
    }

    if (name === 'ma') {
      const maCode = options[0].value;
      try {
        const noiDung = await traCuuMa(maCode);
        const reply = noiDung
          ? `📄 Mã **${maCode}**: ${noiDung}`
          : `❌ Không tìm thấy mã **${maCode}** trong danh sách.`;
        return res.send({ type: 4, data: { content: reply } });
      } catch (err) {
        console.error('❌ Lỗi tra cứu mã:', err);
        return res.send({ type: 4, data: { content: `❌ Có lỗi xảy ra: ${err.message}` } });
      }
    }

    if (name === 'ace') {
      const discordId = member.user.id;
      try {
        const sheetName = 'Tổng hợp xử lý khen thưởng';
        const rangeHeader = `'${sheetName}'!A1:Z2`;
        const resHeader = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: rangeHeader
        });

        const [headers, discordIds] = resHeader.data.values;
        const index = discordIds.indexOf(discordId);
        if (index === -1) {
          return res.send({ type: 4, data: { content: '❌ Không tìm thấy Discord ID của bạn.' } });
        }

        const tenNhanSu = headers[index];
        const colLetter = String.fromCharCode(65 + index);
        const rangeData = `'${sheetName}'!${colLetter}3:${colLetter}7`;
        const resData = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: rangeData
        });

        const diemHienTai = resData.data.values[0]?.[0] || '0';
        const soThang = resData.data.values[3]?.[0] || '0';
        const tongDiem6Thang = resData.data.values[4]?.[0] || '0';

        const msg = `📊 Thông tin ACE của **${tenNhanSu}**:\n` +
          `• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n` +
          `• Số tháng làm việc: **${soThang}** tháng\n` +
          `• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm ✨`;

        return res.send({ type: 4, data: { content: msg } });
      } catch (err) {
        console.error('❌ Lỗi tra cứu ACE:', err);
        return res.send({ type: 4, data: { content: `❌ Có lỗi xảy ra khi tra cứu ACE: ${err.message}` } });
      }
    }
  }
});

// 👉 /send_dm
app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ success: false, error: 'Missing userId or content' });

  try {
    const user = await client.users.fetch(userId);
    await user.send({ content: content, allowedMentions: { parse: [] } });
    console.log(`✅ Đã gửi DM cho ${user.tag}`);
    res.json({ success: true, message: `Đã gửi DM cho ${user.tag}` });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 👉 /send_channel
app.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Missing channelId or content' });

  try {
    const channel = await client.channels.fetch(channelId);
    await channel.send({ content: content, allowedMentions: { parse: ['users'] } });
    console.log(`✅ Đã gửi tin nhắn channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi channel ${channel.name}` });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server chạy ở port ${PORT}`));
client.login(token);
