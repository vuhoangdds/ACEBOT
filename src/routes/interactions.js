// src/routes/interactions.js
import express from 'express';
import nacl from 'tweetnacl';
import config from '../config.js';
import { ping } from '../commands/ping.js';
import { ace } from '../commands/ace.js';
import { ma } from '../commands/ma.js';
import { duyet, tuchoi } from '../commands/duyet.js';

const router = express.Router();

// Đảm bảo req.rawBody có buffer gốc để verify signature
router.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));

router.post('/', async (req, res) => {
  const sig = req.get('X-Signature-Ed25519');
  const ts  = req.get('X-Signature-Timestamp');

  // Verify request đến từ Discord
  const isValid = nacl.sign.detached.verify(
    Buffer.from(ts + req.rawBody),
    Buffer.from(sig, 'hex'),
    Buffer.from(config.DISCORD.PUBLIC_KEY, 'hex')
  );
  if (!isValid) {
    return res.status(401).send('Invalid request signature');
  }

  const interaction = req.body;

  // Pong hồi đáp ngay TYPE 1
  if (interaction.type === 1) {
    return res.send({ type: 1 });
  }
  // Chỉ xử lý SLASH COMMAND (type 2)
  if (interaction.type !== 2) {
    return res.sendStatus(204);
  }

  const { name } = interaction.data;
  let result;

  switch (name) {
    case ping.name:
      result = await ping.execute(interaction);
      break;

    case ace.name:
      result = await ace.execute(interaction);
      break;

    case ma.name:
      result = await ma.execute(interaction);
      break;

    case duyet.name:
      result = await duyet.execute(interaction);
      break;

    case tuchoi.name:
      result = await tuchoi.execute(interaction);
      break;

    default:
      result = { content: '❓ Unknown command' };
  }

  return res.json({ type: 4, data: result });
});

export default router;
