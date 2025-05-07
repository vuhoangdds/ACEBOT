import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';

const app = express();

// ✅ ENV setup
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID; // hoặc bỏ nếu muốn global
const SHEET_ID = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // Hardcode sheet ID

// ✅ Google Sheets API setup
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

// ✅ Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent
  ],
  partials: ['CHANNEL']
});

// ✅ Slash Command register
const commands = [
  {
    name: 'ping',
    description: 'Kiểm tra bot online hay không'
  },
  {
    name: 'ma',
    description: 'Tra cứu mã điểm thưởng/điểm lỗi',
    options: [
      {
        name: 'code',
        description: 'Mã cần tra cứu (ví dụ: CM-01)',
        type: 3,
        required: true
      }
    ]
  },
  {
    name: 'ace',
    description: 'Xem điểm ACE của chính bạn'
  }
];

const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log('🔄 Đang đăng ký Slash Commands...');
    if (GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
      console.log('✅ Đăng ký Slash Commands cho GUILD thành công!');
    } else {
      await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
      console.log('✅ Đăng ký Slash Commands GLOBAL thành công!');
    }
  } catch (err) {
    console.error('❌ Lỗi đăng ký slash command:', err);
  }
})();

// ✅ Bot ready
client.once('ready', () => {
  console.log('✅ Bot đã online!');
});

// ✅ Slash Command interaction
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const { commandName } = interaction;

  if (commandName === 'ping') {
    await interaction.reply({ content: '🏓 Bot đang hoạt động bình thường!', ephemeral: true });
  }

  if (commandName === 'ma') {
    const maCode = interaction.options.getString('code');
    const range = 'Danh sách mã tham chiếu!A:B';
    try {
      const clientAuth = await auth.getClient();
      const res = await sheets.spreadsheets.values.get({
        auth: clientAuth,
        spreadsheetId: SHEET_ID,
        range: range
      });

      const rows = res.data.values;
      const found = rows.find(row => row[0]?.toUpperCase() === maCode.toUpperCase());
      if (found) {
        await interaction.reply({
          content: `📄 Mã **${maCode.toUpperCase()}**: ${found[1]}`,
          ephemeral: true
        });
        console.log(`✅ Trả kết quả mã ${maCode}`);
      } else {
        await interaction.reply({
          content: `❌ Không tìm thấy mã **${maCode.toUpperCase()}** trong sheet.`,
          ephemeral: true
        });
        console.log(`⚠️ Không tìm thấy mã ${maCode}`);
      }
    } catch (err) {
      console.error('❌ Lỗi tra cứu mã:', err);
      await interaction.reply({
        content: `❌ Có lỗi xảy ra khi tra cứu mã:\n\`\`\`\n${err.message}\n\`\`\`\nVui lòng thử lại sau.`,
        ephemeral: true
      });
    }
  }

  if (commandName === 'ace') {
    const user = interaction.user || interaction.member?.user;
    if (!user) {
      await interaction.reply({
        content: '❌ Không thể xác định người dùng từ lệnh này. Hãy thử lại hoặc liên hệ quản trị viên.',
        ephemeral: true
      });
      return;
    }
    const discordId = user.id;

    try {
      const sheetKhenThuong = 'Tổng hợp xử lý khen thưởng';
      const rangeHeader = `'${sheetKhenThuong}'!A1:Z2`;
      const resHeader = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: rangeHeader
      });

      const [headers, discordIds] = resHeader.data.values;
      const index = discordIds.indexOf(discordId);
      if (index === -1) {
        await interaction.reply({
          content: `⚠️ Không tìm thấy Discord ID của bạn trong sheet. Vui lòng liên hệ quản lý để cập nhật thông tin.`,
          ephemeral: true
        });
        console.log(`❌ Discord ID ${discordId} không tìm thấy trong sheet.`);
        return;
      }

      const tenNhanSu = headers[index];
      const colLetter = String.fromCharCode(65 + index);
      const rangeData = `'${sheetKhenThuong}'!${colLetter}3:${colLetter}7`;
      const resData = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: rangeData
      });

      const diemHienTai = resData.data.values[0]?.[0] || "0";
      const soThang = resData.data.values[3]?.[0] || "0";
      const tongDiem6Thang = resData.data.values[4]?.[0] || "0";

      const msg = `📊 Thông tin ACE của **${tenNhanSu}**:\n` +
        `• Điểm ACE tháng hiện tại: **${diemHienTai}** điểm\n` +
        `• Số tháng làm việc: **${soThang}** tháng\n` +
        `• Tổng điểm ACE chu kỳ gần nhất: **${tongDiem6Thang}** điểm ✨`;

      await interaction.reply({ content: msg, ephemeral: true });
      console.log(`✅ Trả kết quả ACE cho ${tenNhanSu} (${discordId})`);
    } catch (err) {
      console.error('❌ Lỗi xử lý /ace:', err);
      await interaction.reply({
        content: `❌ Có lỗi xảy ra khi tra cứu ACE:\n\`\`\`\n${err.message}\n\`\`\`\nVui lòng kiểm tra lại hoặc liên hệ quản trị viên.`,
        ephemeral: true
      });
    }
  }
});

// ✅ Webhook endpoints
app.use(express.json());

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
    res.status(500).json({ success: false, error: err.message, userId: userId });
  }
});

app.post('/send_channel', async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Missing channelId or content' });

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ success: false, error: `Channel ${channelId} not found` });

    await channel.send({ content: content, allowedMentions: { parse: ['users'] } });
    console.log(`✅ Đã gửi tin nhắn channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi channel ${channel.name}` });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy ở port ${PORT}`));
client.login(DISCORD_TOKEN);
