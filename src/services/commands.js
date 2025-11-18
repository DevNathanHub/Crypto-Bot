import { registerUserCommands as registerFromBot } from '../bot/commands.js';

export function registerUserCommands(bot) {
  return registerFromBot(bot);
}

export default { registerUserCommands };