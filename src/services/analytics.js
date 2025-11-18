import ChannelMessage from '../models/ChannelMessage.js';

export async function recordMessage({ title, content, type, geminiPrompt }) {
  try {
    const cm = new ChannelMessage({ title, content, type, geminiPrompt, postedAt: new Date() });
    await cm.save();
    return cm;
  } catch (e) {
    console.warn('recordMessage failed', e);
    return null;
  }
}

export default { recordMessage };
