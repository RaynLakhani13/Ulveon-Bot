const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const VALID_SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Give a score to a song entry (Eurovision-style: 1–8, 10, 12)')
    .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true))
    .addStringOption(o => o.setName('entry_id').setDescription('Entry ID to score').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o =>
      o.setName('score')
        .setDescription('Your score: 1, 2, 3, 4, 5, 6, 7, 8, 10, or 12')
        .setRequired(true)
        .addChoices(
          { name: '12 points', value: 12 },
          { name: '10 points', value: 10 },
          { name: '8 points', value: 8 },
          { name: '7 points', value: 7 },
          { name: '6 points', value: 6 },
          { name: '5 points', value: 5 },
          { name: '4 points', value: 4 },
          { name: '3 points', value: 3 },
          { name: '2 points', value: 2 },
          { name: '1 point', value: 1 },
        )
    ),

  async autocomplete(interaction, db) {
    const focused = interaction.options.getFocused(true);

    if (focused.name === 'edition') {
      const editions = db.listEditions().filter(e =>
        e.id.includes(focused.value) || e.name.toLowerCase().includes(focused.value.toLowerCase())
      );
      return interaction.respond(editions.slice(0, 25).map(e => ({ name: `${e.name} (${e.id})`, value: e.id })));
    }

    if (focused.name === 'entry_id') {
      const editionId = interaction.options.getString('edition');
      if (!editionId) return interaction.respond([]);
      const entries = db.getEntries(editionId).filter(e =>
        e.country.toLowerCase().includes(focused.value.toLowerCase()) ||
        e.artist.toLowerCase().includes(focused.value.toLowerCase()) ||
        e.song.toLowerCase().includes(focused.value.toLowerCase()) ||
        e.entryId.includes(focused.value)
      );
      return interaction.respond(
        entries.slice(0, 25).map(e => ({
          name: `${e.country} — ${e.artist}: ${e.song}`,
          value: e.entryId,
        }))
      );
    }
  },

  async execute(interaction, db) {
    const editionId = interaction.options.getString('edition');
    const entryId = interaction.options.getString('entry_id');
    const score = interaction.options.getInteger('score');

    const edition = db.getEdition(editionId);
    if (!edition) {
      return interaction.reply({ content: `❌ Edition \`${editionId}\` not found.`, ephemeral: true });
    }

    const entry = db.getEntry(editionId, entryId);
    if (!entry) {
      return interaction.reply({ content: `❌ Entry \`${entryId}\` not found in **${edition.name}**.`, ephemeral: true });
    }

    db.setScore(interaction.user.id, interaction.user.username, editionId, entryId, score);

    const pointWord = score === 1 ? 'point' : 'points';
    const stars = score === 12 ? ' 🌟' : score === 10 ? ' ⭐' : score >= 8 ? ' ✨' : '';

    const embed = new EmbedBuilder()
      .setColor(scoreColour(score))
      .setTitle(`${score} ${pointWord}${stars}`)
      .setDescription(`**${interaction.user.displayName}** gave **${score} ${pointWord}** to:`)
      .addFields(
        { name: 'Country', value: entry.country, inline: true },
        { name: 'Artist', value: entry.artist, inline: true },
        { name: 'Song', value: entry.song, inline: true },
        { name: 'Edition', value: edition.name, inline: true },
      )
      .setFooter({ text: 'Use /myranking to see all your scores • /scoreboard to see the leaderboard' });

    return interaction.reply({ embeds: [embed] });
  }
};

function scoreColour(score) {
  if (score === 12) return 0xFFD700;
  if (score === 10) return 0xFFA500;
  if (score >= 7) return 0x00CC66;
  if (score >= 4) return 0x0099FF;
  return 0x888888;
}
