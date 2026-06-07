require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const db = require('./database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
  ]
});

client.commands = new Collection();

// Load commands
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

client.once('ready', () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
  console.log(`📊 Database ready`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  if (interaction.isAutocomplete()) {
    try {
      await command.autocomplete(interaction);
    } catch (err) {
      console.error(err);
    }
    return;
  }

  try {
    await command.execute(interaction, db);
  } catch (error) {
    console.error(error);
    const msg = { content: '❌ Something went wrong.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(msg);
    } else {
      await interaction.reply(msg);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
