import express from 'express';
import { google } from 'googleapis';
import nacl from 'tweetnacl';
import bodyParser from 'body-parser';
import fetch from 'node-fetch'; // Nếu cần gửi HTTP từ server (hiếm)

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

const sheetId = '1pkXoeQeVGriV7dwkoaLEh3irWA8YcSyt9zawxvvHh30'; // Google Sheet ID
const range = 'Danh sách mã tham chiếu!A:B'; // Sheet + cột

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

// 👉 Verify signature middleware
function verifyDiscordRequest(req, res, buf) {
  const signature = req.get('X-Signature-Ed25519');
  const timestamp = req.get('X-Signature-Timestamp');

  if (!signature || !timestamp) {
    res.status(401).send('Missing signature or timestamp');
    return;
  }

  const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + buf),
    Buffer.from(signature, 'hex'),
    Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
  );

  if (!isVerified) {
    console.warn('⚠️ Invalid request signature');
    res.status(401).send('Invalid request signature');
    throw new Error('Invalid request signature');
  }
}

// ✅ Slash command webhook (interactions)
app.post('/interactions', bodyParser.raw({ type: 'application/json' }), (req, res) => {
  try {
    verifyDiscordRequest(req, res, req.body);

    const interaction = JSON.parse(req.body.toString('utf8'));
    console.log('🔥 Interaction received:', interaction.type);

    // Pong back cho ping
    if (interaction.type === 1) {
      return res.json({ type: 1 });
    }

    if (interaction.type === 2) {
      const commandName = interaction.data.name;
      const options = interaction.data.options || [];

      if (commandName === 'ma') {
        const maCode = options.find(opt => opt.name === 'code')?.value?.toUpperCase();
        if (!maCode) {
          return res.json({
            type: 4,
            data: {
              content: '❌ Bạn chưa nhập mã cần tra cứu.'
            }
          });
        }

        traCuuMaLoi(maCode)
          .then(noiDung => {
            const reply = noiDung
              ? `📄 Mã **${maCode}**: ${noiDung}`
              : `❌ Không tìm thấy mã **${maCode}** trong danh sách.`;

            return res.json({
              type: 4,
              data: {
                content: reply
              }
            });
          })
          .catch(err => {
            console.error('❌ Lỗi tra cứu mã:', err);
            return res.json({
              type: 4,
              data: {
                content: '❌ Có lỗi xảy ra khi tra cứu mã.'
              }
            });
          });
      } else if (commandName === 'ping') {
        return res.json({
          type: 4,
          data: {
            content: '🏓 Pong!'
          }
        });
      } else {
        return res.json({
          type: 4,
          data: {
            content: `❓ Slash command chưa hỗ trợ: ${commandName}`
          }
        });
      }
    }
  } catch (err) {
    console.error('❌ Lỗi xử lý interaction:', err);
    if (!res.headersSent) {
      res.status(500).send('Server error');
    }
  }
});

// ✅ Webhook gửi DM từ Google Script (hoặc nguồn khác)
app.post('/send_dm', express.json(), async (req, res) => {
  const { userId, content } = req.body;
  if (!userId || !content) {
    return res.status(400).json({ success: false, error: 'Missing userId or content' });
  }

  try {
    // Gửi trực tiếp qua Discord API
    await fetch(`https://discord.com/api/v10/users/@me/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        recipient_id: userId,
        content: content,
        allowed_mentions: { parse: [] }
      })
    });

    console.log(`✅ Đã gửi DM cho userId: ${userId}`);
    res.json({ success: true, message: `Đã gửi DM cho userId: ${userId}` });
  } catch (err) {
    console.error('❌ Lỗi gửi DM:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Webhook gửi tin nhắn channel từ Google Script (hoặc nguồn khác)
app.post('/send_channel', express.json(), async (req, res) => {
  const { channelId, content } = req.body;
  if (!channelId || !content) {
    return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  }

  try {
    await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: content,
        allowed_mentions: { parse: ['users'] }
      })
    });

    console.log(`✅ Đã gửi message lên channelId: ${channelId}`);
    res.json({ success: true, message: `Đã gửi message lên channelId: ${channelId}` });
  } catch (err) {
    console.error('❌ Lỗi gửi channel:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ✅ Check server
app.get('/', (req, res) => res.send('Bot server is running!'));
app.get('/ping', (req, res) => res.send('Pong! Bot is alive.'));

// 👉 Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server chạy ở port ${PORT}`));
