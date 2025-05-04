
const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const { google } = require('googleapis');
const app = express();

// 👉 Google Sheets API setup (dùng ENV)
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

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // ✅ Google Sheet ID
const range = 'Danh sách mã tham chiếu!A:B'; // ✅ Tên sheet + cột A (Mã), B (Nội dung)

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessageReactions,
    GatewayIntentBits.DirectMessageTyping
  ],
  partials: [
    'CHANNEL',
    'MESSAGE',
    'USER',
    'GUILD_MEMBER',
    'REACTION',
    'DIRECT_MESSAGE'
  ]
});

const token = process.env.DISCORD_TOKEN;

// 👉 Hàm tra cứu mã lỗi từ Google Sheets
async function traCuuMaLoi(maCode) {
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

client.once('ready', () => {
  console.log('✅ Bot đã online!');
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  // 📌 Lệnh ping
  if (message.content === '!ping') {
    return message.reply('Pong! 🏓');
  }

  // 📌 Lệnh gửi DM
  if (message.content.startsWith('!send')) {
    const parts = message.content.split(' ');
    const userId = parts[1];
    const content = parts.slice(2).join(' ');

    try {
      const user = await client.users.fetch(userId);
      await user.send(content);
      message.reply(`✅ Đã gửi DM cho <@${userId}>`);
    } catch (err) {
      console.error('❌ Gửi DM lỗi:', err);
      message.reply(`❌ Không gửi được DM cho <@${userId}>: ${err.message}`);
    }
  }

  // 📌 Lệnh tra cứu mã lỗi
  if (message.content.startsWith('!ma ')) {
    const parts = message.content.split(' ');
    const maCode = parts[1]?.toUpperCase();

    if (!maCode) {
      return message.reply('❌ Hãy nhập mã lỗi sau lệnh !ma');
    }

    try {
      const noiDung = await traCuuMaLoi(maCode);
      if (noiDung) {
        message.reply(`📄 Mã **${maCode}**: ${noiDung}`);
      } else {
        message.reply(`❌ Không tìm thấy mã **${maCode}** trong danh sách.`);
      }
    } catch (err) {
      console.error('❌ Lỗi tra cứu mã:', err);
      
      if (err.message?.includes('API has not been used')) {
        message.reply('❌ Google Sheets API chưa được kích hoạt. Vui lòng liên hệ admin.');
      } else if (err.code === 403) {
        message.reply('❌ Bot không có quyền truy cập Google Sheet. Vui lòng kiểm tra lại credentials.');
      } else {
        message.reply('❌ Có lỗi xảy ra khi tra cứu. Vui lòng thử lại sau.');
      }
    }
  }
});

// Webhook endpoint
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Bot server is running!');
});

app.post('/send_dm', async (req, res) => {
  const { userId, content } = req.body;

  if (!userId || !content) {
    return res.status(400).json({
      success: false,
      error: 'Missing userId or content'
    });
  }

  try {
    console.log(`Đang tìm user ${userId}...`);
    const user = await client.users.fetch(userId);
    console.log(`Đã tìm thấy user ${user.tag}`);

    await user.send({
      content: content,
      allowedMentions: { parse: [] }
    });

    console.log(`✅ Đã gửi DM cho ${user.tag}`);
    res.json({
      success: true,
      message: `Đã gửi tin nhắn cho ${user.tag}`
    });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({
      success: false,
      error: err.message,
      userId: userId
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server đang chạy ở port ${PORT}`);
});

client.login(token);
