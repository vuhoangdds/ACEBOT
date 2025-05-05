import { Client, GatewayIntentBits } from 'discord.js';
import express from 'express';
import { google } from 'googleapis';
import fetch from 'node-fetch';

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

// Khởi tạo Google Sheets client
const sheetsClientPromise = auth.getClient().then(auth => google.sheets({ version: 'v4', auth }));
const sheetsClient = await sheetsClientPromise;

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // Google Sheet ID
const range = 'Danh sách mã tham chiếu!A:B'; // Sheet + cột

// ✅ Mapping nhân sự từ ENV
let mappingNhanSu = [];
try {
  mappingNhanSu = JSON.parse(process.env.MAPPING_NHANSU || '[]');
  console.log('✅ Mapping nhân sự load từ ENV:', mappingNhanSu);
} catch (err) {
  console.error('❌ Lỗi parse MAPPING_NHANSU:', err);
}

// ✅ Map tracking messageId → discordIdNguoiDuyet  
const pendingApprovals = new Map();

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
  partials: ['CHANNEL', 'MESSAGE', 'USER', 'GUILD_MEMBER', 'REACTION', 'DIRECT_MESSAGE']
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

  if (message.content === '!ping') return message.reply('Pong! 🏓');

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

  if (message.content.startsWith('!ma ')) {
    const parts = message.content.split(' ');
    const maCode = parts[1]?.toUpperCase();
    if (!maCode) return message.reply('❌ Hãy nhập mã lỗi sau lệnh !ma');
    try {
      const noiDung = await traCuuMaLoi(maCode);
      if (noiDung) {
        message.reply(`📄 Mã **${maCode}**: ${noiDung}`);
      } else {
        message.reply(`❌ Không tìm thấy mã **${maCode}** trong danh sách.`);
      }
    } catch (err) {
      console.error('❌ Lỗi tra cứu mã:', err);
      let errorMsg = '❌ Có lỗi xảy ra khi tra cứu: ';
      if (err.message?.includes('API has not been used')) {
        errorMsg += 'Google Sheets API chưa được kích hoạt.';
      } else if (err.code === 403) {
        errorMsg += 'Bot không có quyền truy cập Google Sheet.';
      } else {
        errorMsg += err.message;
      }
      await message.reply(errorMsg);
    }
  }

  if (message.content === '!ace') {
    const discordId = message.author.id;
    try {
      const sheetKhenThuong = 'Tổng hợp xử lý khen thưởng';
      const rangeHeader = `'${sheetKhenThuong}'!A1:Z2`;
      const resHeader = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: rangeHeader
      });

      const [headers, discordIds] = resHeader.data.values;
      const index = discordIds.indexOf(discordId);
      if (index === -1) {
        await message.reply(`❌ Không tìm thấy Discord ID của bạn.`);
        return;
      }

      const tenNhanSu = headers[index];
      const colLetter = String.fromCharCode(65 + index);
      const rangeData = `'${sheetKhenThuong}'!${colLetter}3:${colLetter}7`;
      const resData = await sheetsClient.spreadsheets.values.get({
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

      await message.reply(msg);
    } catch (err) {
      console.error('❌ Lỗi xử lý !ace:', err);
      await message.reply(`❌ Có lỗi xảy ra khi tra cứu ACE: ${err.message}`);
    }
  }
});

// Webhook endpoint
app.use(express.json());

app.get('/', (req, res) => res.send('Bot server is running!'));
app.get('/ping', (req, res) => res.send('Pong! Bot is alive.'));

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

// ✅ Webhook gửi message channel + tracking
app.post('/send_channel', async (req, res) => {
  const { channelId, content, discordIdNguoiDuyet } = req.body;
  if (!channelId || !content) return res.status(400).json({ success: false, error: 'Missing channelId or content' });

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel) return res.status(404).json({ success: false, error: `Channel ${channelId} not found` });

    const sentMessage = await channel.send({ content: content, allowedMentions: { parse: ['users'] } });
    if (discordIdNguoiDuyet) {
      pendingApprovals.set(sentMessage.id, discordIdNguoiDuyet);
      console.log(`✅ Tracking messageId=${sentMessage.id} cho discordIdNguoiDuyet=${discordIdNguoiDuyet}`);
    }

    console.log(`✅ Đã gửi tin nhắn channel ${channel.name}`);
    res.json({ success: true, message: `Đã gửi channel ${channel.name}`, messageId: sentMessage.id });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Lắng nghe reaction
client.on('messageReactionAdd', async (reaction, user) => {
  try {
    console.log(`🔥 [reaction] Received reaction event!`);
    console.log(`📝 messageId = ${reaction.message.id}`);
    console.log(`👤 userId = ${user.id} (${user.tag})`);
    console.log(`😀 emoji = ${reaction.emoji.name}`);
    console.log(`📋 pendingApprovals keys = ${JSON.stringify(Array.from(pendingApprovals.keys()))}`);

    if (user.bot) {
      console.log(`⏩ Reaction from bot → ignored.`);
      return;
    }

    if (!pendingApprovals.has(reaction.message.id)) {
      console.log(`⚠️ Reaction messageId ${reaction.message.id} NOT FOUND in pendingApprovals.`);
      return;
    }

    const discordIdNguoiDuyet = pendingApprovals.get(reaction.message.id);
    console.log(`✅ Found pendingApproval: discordIdNguoiDuyet = ${discordIdNguoiDuyet}`);

    const channel = reaction.message.channel;

    if (user.id === discordIdNguoiDuyet) {
      const nguoiDuyet = mappingNhanSu.find(u => u.discordId === user.id);
      const tenNguoiDuyet = nguoiDuyet ? nguoiDuyet.tenNhanSu : 'Người duyệt';
      await channel.send(`✅ Đơn đã được duyệt bởi **${tenNguoiDuyet}**.`);
      console.log(`✅ Reaction APPROVED by đúng người (${user.tag})`);
      pendingApprovals.delete(reaction.message.id);
      console.log(`🗑️ Removed messageId ${reaction.message.id} from pendingApprovals.`);
    } else {
      await channel.send(`❌ <@${user.id}> không phải người duyệt, vui lòng không phê duyệt hộ.`);
      console.log(`🚨 Reaction từ ${user.tag} KHÔNG ĐÚNG người duyệt (${discordIdNguoiDuyet})`);
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý reaction:', err);
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy ở port ${PORT}`));
client.login(token);
