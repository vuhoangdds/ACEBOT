import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import crypto from 'crypto';

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

const sheetsClientPromise = auth.getClient().then(auth => google.sheets({ version: 'v4', auth }));
const sheetsClient = await sheetsClientPromise;

const sheetId = process.env.SHEET_ID; // Sheet ID từ env
const range = 'Danh sách mã tham chiếu!A:B'; // Ví dụ: mã + mô tả

// ✅ Slash command đăng ký
const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID; // Test nhanh trong 1 server

const commands = [
  {
    name: 'ping',
    description: 'Kiểm tra bot còn sống.',
  },
  {
    name: 'ma',
    description: 'Tra cứu mã lỗi hoặc mã thưởng.',
    options: [
      {
        name: 'code',
        type: 3, // STRING
        description: 'Nhập mã cần tra cứu',
        required: true,
      },
    ],
  },
];

// ✅ Khởi tạo Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL'],
});

// 👉 Hàm tra cứu mã từ Google Sheets
async function traCuuMaLoi(maCode) {
  const clientAuth = await auth.getClient();
  const res = await sheets.spreadsheets.values.get({
    auth: clientAuth,
    spreadsheetId: sheetId,
    range: range,
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

// 👉 Đăng ký slash command khi bot khởi động
client.once('ready', async () => {
  console.log('✅ Bot đã online! Đang đăng ký slash command...');

  const rest = new REST({ version: '10' }).setToken(token);
  try {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );
    console.log('✅ Slash command đã đăng ký thành công!');
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash command:', err);
  }
});

// 👉 Xử lý slash command
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'ping') {
    await interaction.reply('🏓 Pong! Bot đang hoạt động.');
  }

  if (interaction.commandName === 'ma') {
    const maCode = interaction.options.getString('code');
    try {
      const noiDung = await traCuuMaLoi(maCode);
      if (noiDung) {
        await interaction.reply(`📄 Mã **${maCode}**: ${noiDung}`);
      } else {
        await interaction.reply(`❌ Không tìm thấy mã **${maCode}** trong danh sách.`);
      }
    } catch (err) {
      console.error('❌ Lỗi tra cứu mã:', err);
      await interaction.reply('❌ Đã xảy ra lỗi khi tra cứu mã.');
    }
  }
});

// ✅ Webhook /send_dm
app.use(express.json());

app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) return res.status(400).json({ success: false, error: 'Thiếu userId hoặc content' });

  try {
    const user = await client.users.fetch(userId);
    await user.send({ content: content, allowedMentions: { parse: [] } });
    console.log(`✅ Đã gửi DM cho ${user.tag}`);
    res.json({ success: true, message: `Đã gửi DM cho ${user.tag}` });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({ success: false, error: err.message, userId });
  }
});

// ✅ Webhook /send_channel
app.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Thiếu channelId hoặc content' });

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ success: false, error: `Không tìm thấy channel ${channelId}` });

    await channel.send({ content: content, allowedMentions: { parse: ['users'] } });
    console.log(`✅ Đã gửi tin nhắn vào channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi tin nhắn vào channel ${channel.name}` });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 👉 Health check
app.get('/', (req, res) => res.send('Bot server is running!'));
app.get('/ping', (req, res) => res.send('Pong! Bot is alive.'));

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy ở port ${PORT}`));

client.login(token);
