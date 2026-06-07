require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');

const commands = fs.readdirSync('./commands')
  .filter(f => f.endsWith('.js'))
  .map(f => require(`./commands/${f}`).data.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  console.log(`📡 Registering ${commands.length} slash commands...`);
  try {
    if (process.env.GUILD_ID) {
      // Guild deploy (instant, for testing)
      await rest.put(
        Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
        { body: commands }
      );
      console.log(`✅ Commands registered to guild ${process.env.GUILD_ID} (instant)`);
    } else {
      // Global deploy (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(process.env.CLIENT_ID),
        { body: commands }
      );
      console.log('✅ Commands registered globally (up to 1hr to propagate)');
    }
  } catch (err) {
    console.error('❌ Failed to register commands:', err);
  }
})();
