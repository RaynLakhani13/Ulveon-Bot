const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('myranking')
    .setDescription('View your scores for an edition')
    .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true))
    .addUserOption(o => o.setName('user').setDescription('View another user\'s ranking (optional)')),

  async autocomplete(interaction, db) {
    const focused = interaction.options.getFocused();
    const editions = db.listEditions().filter(e =>
      e.id.includes(focused) || e.name.toLowerCase().includes(focused.toLowerCase())
    );
    return interaction.respond(editions.slice(0, 25).map(e => ({ name: `${e.name} (${e.id})`, value: e.id })));
  },

  async execute(interaction, db) {
    const editionId = interaction.options.getString('edition');
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const edition = db.getEdition(editionId);

    if (!edition) {
      return interaction.reply({ content: `❌ Edition \`${editionId}\` not found.`, ephemeral: true });
    }

    const ranking = db.getUserRanking(targetUser.id, editionId);
    const entries = db.getEntries(editionId);
    const entryMap = Object.fromEntries(entries.map(e => [e.entryId, e]));

    const scoredIds = new Set(ranking.map(r => r.entryId));
    const unscored = entries.filter(e => !scoredIds.has(e.entryId));

    const isSelf = targetUser.id === interaction.user.id;
    const title = isSelf
      ? `🗳️ Your rankings — ${edition.name}`
      : `🗳️ ${targetUser.displayName}'s rankings — ${edition.name}`;

    let desc = '';
    if (ranking.length === 0) {
      desc = isSelf
        ? `You haven't scored any entries yet.\nUse \`/rank\` to start scoring!`
        : `${targetUser.displayName} hasn't scored any entries yet.`;
    } else {
      desc = ranking.map((r, i) => {
        const e = entryMap[r.entryId];
        if (!e) return null;
        const medal = r.score === 12 ? '🥇' : r.score === 10 ? '🥈' : r.score >= 8 ? '🥉' : '▪️';
        return `${medal} **${r.score} pts** — ${e.country}: **${e.artist}** · *${e.song}*`;
      }).filter(Boolean).join('\n');
    }

    const embed = new EmbedBuilder()
      .setColor(0xFFD700)
      .setTitle(title)
      .setDescription(desc);

    if (ranking.length > 0) {
      const total = ranking.reduce((sum, r) => sum + r.score, 0);
      embed.addFields({ name: 'Total points given', value: String(total), inline: true });
      embed.addFields({ name: 'Songs scored', value: `${ranking.length} / ${entries.length}`, inline: true });
    }

    if (unscored.length > 0 && isSelf) {
      embed.setFooter({ text: `${unscored.length} song(s) not yet scored. Use /rank to continue.` });
    }

    return interaction.reply({ embeds: [embed], ephemeral: isSelf });
  }
};
