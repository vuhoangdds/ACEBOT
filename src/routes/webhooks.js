import express from 'express';
import { sendDM, sendChannel } from '../services/discordService.js';

const router = express.Router();

/**
 * POST /send_dm
 * Body: { discordId or userId, message or content }
 */
router.post('/send_dm', (req, res) => {
  const userId = req.body.userId || req.body.discordId;
  const content = req.body.content || req.body.message;

  console.log('📥 Nhận yêu cầu gửi DM:');
  console.log('• userId:', userId);
  console.log('• content:', content);

  if (!userId || !content) {
    console.warn('⚠️ Thiếu userId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing userId or content' });
  }

  // BƯỚC 1: TRẢ LỜI CHO GOOGLE APPS SCRIPT NGAY LẬP TỨC
  res.status(200).json({ success: true, status: 'Request received and is being processed.' });

  // BƯỚC 2: THỰC HIỆN GỬI TIN NHẮN TRONG NỀN (fire-and-forget)
  // Chúng ta không dùng "await" ở đây để không bắt Google phải chờ.
  sendDM(req.app.get('discordClient'), userId, content)
    .then(() => {
      console.log(`✅ Gửi DM thành công tới user ${userId}`);
    })
    .catch(e => {
      // Nếu có lỗi, chỉ ghi log trên server Render chứ không ảnh hưởng đến Google Apps Script
      console.error(`❌ Lỗi khi gửi DM (trong nền) tới user ${userId}:`, e.message);
    });
});

/**
 * POST /send_channel
 * Body: { channelId, content }
 */
router.post('/send_channel', (req, res) => {
  const channelId = req.body.channelId;
  const content = req.body.content;

  console.log('📥 Nhận yêu cầu gửi Channel:');
  console.log('• channelId:', channelId);
  console.log('• content:', content);

  if (!channelId || !content) {
    console.warn('⚠️ Thiếu channelId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  }

  // BƯỚC 1: TRẢ LỜI CHO GOOGLE APPS SCRIPT NGAY LẬP TỨC
  res.status(200).json({ success: true, status: 'Request received and is being processed.' });

  // BƯỚC 2: THỰC HIỆN GỬI TIN NHẮN TRONG NỀN
  sendChannel(req.app.get('discordClient'), channelId, content)
    .then(() => {
      console.log(`✅ Gửi Channel thành công tới kênh ${channelId}`);
    })
    .catch(e => {
      console.error(`❌ Lỗi khi gửi Channel (trong nền) tới kênh ${channelId}:`, e.message);
    });
});

export default router;
