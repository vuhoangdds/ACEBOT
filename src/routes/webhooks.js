import express from 'express';
import { sendDM, sendChannel } from '../services/discordService.js';

const router = express.Router();

/**
 * POST /send_dm
 * Body: { discordId or userId, message or content }
 */
router.post('/send_dm', async (req, res) => {
  const userId = req.body.userId || req.body.discordId;
  const content = req.body.content || req.body.message;

  console.log('📥 Nhận yêu cầu gửi DM:');
  console.log('• userId:', userId);
  console.log('• content:', content);

  if (!userId || !content) {
    console.warn('⚠️ Thiếu userId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing userId or content' });
  }

  try {
    await sendDM(req.app.get('discordClient'), userId, content);
    console.log('✅ Gửi DM thành công');
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ Lỗi khi gửi DM:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * POST /send_channel
 * Body: { channelId, content }
 */
router.post('/send_channel', async (req, res) => {
  const channelId = req.body.channelId;
  const content = req.body.content;

  console.log('📥 Nhận yêu cầu gửi Channel:');
  console.log('• channelId:', channelId);
  console.log('• content:', content);

  if (!channelId || !content) {
    console.warn('⚠️ Thiếu channelId hoặc content');
    return res.status(400).json({ success: false, error: 'Missing channelId or content' });
  }

  try {
    await sendChannel(req.app.get('discordClient'), channelId, content);
    console.log('✅ Gửi Channel thành công');
    return res.json({ success: true });
  } catch (e) {
    console.error('❌ Lỗi khi gửi Channel:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
