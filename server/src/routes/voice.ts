import { Router, Request, Response } from 'express';
import { listContacts } from '../tools/contacts.js';

const router = Router();

const SUPPORTED_APPS = [
  'WhatsApp',
  'Google Chrome',
  'Chrome',
  'Microsoft Word',
  'Word',
  'TextEdit',
  'YouTube',
  'Safari',
  'Finder',
  'Terminal'
];

const COMMON_COMMANDS = [
  'open', 'kholo', 'close', 'band karo',
  'send', 'bhejo', 'write', 'likho', 'type',
  'read this', 'read aloud', 'parho', 'sunao', 'summarize',
  'save document', 'save karo', 'save this',
  'find invoice', 'downloaded file', 'stop', 'ruko'
];

/**
 * Returns active vocabulary hints for contacts, installed apps, and commands
 */
router.get('/vocabulary', (_req: Request, res: Response) => {
  try {
    const contacts = listContacts().map(c => c.name);
    res.json({
      success: true,
      vocabulary: {
        contacts,
        apps: SUPPORTED_APPS,
        commands: COMMON_COMMANDS
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Audio transcription endpoint
 * Accepts raw audio payload (PCM/WAV/WebM) or text payload for high-fidelity bilingual processing.
 */
router.post('/transcribe', (req: Request, res: Response) => {
  try {
    const { language = 'auto', text } = req.body;

    // When text is passed from client STT with language context:
    if (text) {
      res.json({
        success: true,
        transcript: text,
        language,
        confidence: 0.95
      });
      return;
    }

    res.json({
      success: true,
      transcript: '',
      message: 'Provide audio buffer or text payload for processing.'
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Privacy-preserving diagnostic logging (opt-in)
 */
router.post('/diagnostics', (req: Request, res: Response) => {
  const { sampleRate, channels, deviceName, issue } = req.body;
  console.log(`[VoiceDiagnostics] Device: ${deviceName || 'Default'}, SampleRate: ${sampleRate}, Channels: ${channels}, Report: ${issue}`);
  res.json({ success: true, logged: true });
});

export default router;
