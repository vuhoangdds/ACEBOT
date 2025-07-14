import express from 'express';
import { sendDM, sendChannel } from '../services/discordService.js';

const router = express.Router();

/**
 * POST /send_dm
 */
router.post('/send_dm', async (req, res) => {
  const userId = req.body.userId || req.body.discordId;
  const content = req.body.content || req.body.message;

  console.log('📥 Nhận yêu cầu gửi DM:');
  console.log('• userId:', userId);

  if (!userId || !content) {
    console.warn('⚠️ Thiếu userId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing userId or content' });
  }

  // BƯỚC 1: PHẢN HỒI "ĐÃ CHẤP NHẬN" VỀ CHO GOOGLE NGAY LẬP TỨC
  // Status 202 Accepted là mã chuẩn cho kịch bản này.
  res.status(202).json({ status: 'Accepted', message: 'Yêu cầu đã được chấp nhận và đang được xử lý trong nền.' });

  // BƯỚC 2: SAU KHI ĐÃ PHẢN HỒI, BÂY GIỜ MỚI THỰC SỰ CHỜ ĐỢI ĐỂ GỬI TIN
  // Việc này đảm bảo tiến trình trên Render không bị dừng đột ngột.
  try {
    console.log('>> Bắt đầu thực hiện gửi DM trong nền...');
    await sendDM(req.app.get('discordClient'), userId, content);
    console.log(`✅ Gửi DM trong nền thành công tới user ${userId}`);
  } catch (e) {
    console.error(`❌ Lỗi khi gửi DM trong nền tới user ${userId}:`, e.message);
  }
});

/**
 * POST /send_channel
 */
router.post('/send_channel', async (req, res) => {
  const channelId = req.body.channelId;
  const content = req.body.content;

  console.log('📥 Nhận yêu cầu gửi Channel:');
  console.log('• channelId:', channelId);

  if (!channelId || !content) {
    console.warn('⚠️ Thiếu channelId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  }

  // BƯỚC 1: PHẢN HỒI "ĐÃ CHẤP NHẬN" VỀ CHO GOOGLE NGAY LẬP TỨC
  res.status(202).json({ status: 'Accepted', message: 'Yêu cầu đã được chấp nhận và đang được xử lý trong nền.' });

  // BƯỚC 2: SAU KHI ĐÃ PHẢN HỒI, BÂY GIỜ MỚI THỰC SỰ CHỜ ĐỢI ĐỂ GỬI TIN
  try {
    console.log('>> Bắt đầu thực hiện gửi Channel trong nền...');
    await sendChannel(req.app.get('discordClient'), channelId, content);
    console.log(`✅ Gửi Channel trong nền thành công tới kênh ${channelId}`);
  } catch (e) {
    console.error(`❌ Lỗi khi gửi Channel trong nền tới kênh ${channelId}:`, e.message);
  }
});

export default router;
