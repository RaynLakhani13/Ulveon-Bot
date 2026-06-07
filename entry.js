const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { nanoid } = require('../utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('entry')
    .setDescription('Manage song entries in an edition')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add a song entry to an edition')
        .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName('country').setDescription('Country/territory name').setRequired(true))
        .addStringOption(o => o.setName('artist').setDescription('Artist name').setRequired(true))
        .addStringOption(o => o.setName('song').setDescription('Song title').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('List all entries in an edition')
        .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove an entry from an edition')
        .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true))
        .addStringOption(o => o.setName('entry_id').setDescription('Entry ID to remove').setRequired(true))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction, db) {
    const focused = interaction.options.getFocused();
    const editions = db.listEditions().filter(e => e.id.includes(focused) || e.name.toLowerCase().includes(focused.toLowerCase()));
    await interaction.respond(editions.slice(0, 25).map(e => ({ name: `${e.name} (${e.id})`, value: e.id })));
  },

  async execute(interaction, db) {
    const sub = interaction.options.getSubcommand();
    const editionId = interaction.options.getString('edition');
    const edition = db.getEdition(editionId);

    if (!edition) {
      return interaction.reply({ content: `❌ Edition \`${editionId}\` not found.`, ephemeral: true });
    }

    if (sub === 'add') {
      const country = interaction.options.getString('country');
      const artist = interaction.options.getString('artist');
      const song = interaction.options.getString('song');
      const entryId = nanoid();

      db.addEntry(entryId, editionId, country, artist, song);

      const embed = new EmbedBuilder()
        .setColor(0x00BFFF)
        .setTitle('🎵 Entry Added')
        .addFields(
          { name: 'Edition', value: edition.name, inline: true },
          { name: 'Country', value: country, inline: true },
          { name: 'Entry ID', value: `\`${entryId}\``, inline: true },
          { name: 'Artist', value: artist, inline: true },
          { name: 'Song', value: song, inline: true },
        );
      return interaction.reply({ embeds: [embed] });
    }

    if (sub === 'list') {
      const entries = db.getEntries(editionId);
      if (!entries.length) {
        return interaction.reply({ content: `📭 No entries in **${edition.name}** yet. Use \`/entry add\` to add some.`, ephemeral: true });
      }

      const lines = entries.map((e, i) =>
        `**${i + 1}.** 🏳️ ${e.country} — **${e.artist}** · *${e.song}* \`${e.entryId}\``
      );

      // Split into chunks if needed
      const chunks = [];
      let current = [];
      for (const line of lines) {
        current.push(line);
        if (current.join('\n').length > 3800) {
          chunks.push(current.slice(0, -1).join('\n'));
          current = [line];
        }
      }
      chunks.push(current.join('\n'));

      const embeds = chunks.map((desc, i) =>
        new EmbedBuilder()
          .setColor(0xFFD700)
          .setTitle(i === 0 ? `🎤 ${edition.name} — Entries (${entries.length})` : null)
          .setDescription(desc)
      );

      return interaction.reply({ embeds: embeds.slice(0, 10) });
    }

    if (sub === 'remove') {
      const entryId = interaction.options.getString('entry_id');
      const removed = db.removeEntry(editionId, entryId);
      if (!removed) {
        return interaction.reply({ content: `❌ Entry \`${entryId}\` not found in **${edition.name}**.`, ephemeral: true });
      }
      return interaction.reply({ content: `🗑️ Entry \`${entryId}\` removed from **${edition.name}**. All scores for this entry have been wiped.` });
    }
  }
};
