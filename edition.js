const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('edition')
    .setDescription('Manage contest editions')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a new edition')
        .addStringOption(o => o.setName('id').setDescription('Short ID e.g. "2024"').setRequired(true))
        .addStringOption(o => o.setName('name').setDescription('Full name e.g. "Grand Prix 2024"').setRequired(true))
        .addIntegerOption(o => o.setName('year').setDescription('Year').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all editions')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction, db) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const id = interaction.options.getString('id').toLowerCase().replace(/\s+/g, '-');
      const name = interaction.options.getString('name');
      const year = interaction.options.getInteger('year');

      if (db.getEdition(id)) {
        return interaction.reply({ content: `❌ Edition \`${id}\` already exists.`, ephemeral: true });
      }

      db.createEdition(id, name, year);
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('✨ New Edition Created')
        .addFields(
          { name: 'ID', value: `\`${id}\``, inline: true },
          { name: 'Name', value: name, inline: true },
          { name: 'Year', value: String(year), inline: true },
        )
        .setFooter({ text: 'Use /entry add to start adding songs' });
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const editions = db.listEditions();
      if (!editions.length) {
        return interaction.reply({ content: '📭 No editions yet. Use `/edition create` to add one.', ephemeral: true });
      }
      const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle('🎤 Contest Editions')
        .setDescription(
          editions.map(e => `**${e.name}** \`${e.id}\` — ${e.year}`).join('\n')
        );
      return interaction.reply({ embeds: [embed] });
    }
  }
};
