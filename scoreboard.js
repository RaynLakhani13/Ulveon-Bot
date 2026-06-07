const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('scoreboard')
    .setDescription('Show the current leaderboard for an edition')
    .addStringOption(o => o.setName('edition').setDescription('Edition ID').setRequired(true).setAutocomplete(true)),

  async autocomplete(interaction, db) {
    const focused = interaction.options.getFocused();
    const editions = db.listEditions().filter(e =>
      e.id.includes(focused) || e.name.toLowerCase().includes(focused.toLowerCase())
    );
    return interaction.respond(editions.slice(0, 25).map(e => ({ name: `${e.name} (${e.id})`, value: e.id })));
  },

  async execute(interaction, db) {
    const editionId = interaction.options.getString('edition');
    const edition = db.getEdition(editionId);

    if (!edition) {
      return interaction.reply({ content: `❌ Edition \`${editionId}\` not found.`, ephemeral: true });
    }

    await interaction.deferReply();

    const board = db.getLeaderboard(editionId);
    const voterCount = db.getVoterCount(editionId);

    if (!board.length) {
      return interaction.editReply({ content: `📭 No entries in **${edition.name}** yet.` });
    }

    const hasVotes = board.some(e => e.totalPoints > 0);

    const MEDALS = ['🥇', '🥈', '🥉'];

    const lines = board.map((e, i) => {
      const pos = MEDALS[i] || `**${i + 1}.**`;
      const pts = hasVotes ? ` — **${e.totalPoints} pts** (avg ${e.avgScore}, ${e.voterCount} voter${e.voterCount !== 1 ? 's' : ''})` : '';
      return `${pos} ${e.country}: **${e.artist}** · *${e.song}*${pts}`;
    });

    // Chunk into multiple embeds if needed
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
        .setTitle(i === 0 ? `🏆 ${edition.name} — Scoreboard` : null)
        .setDescription(desc)
        .setFooter(i === chunks.length - 1 ? {
          text: hasVotes
            ? `${voterCount} voter${voterCount !== 1 ? 's' : ''} • Use /rank to cast your scores`
            : `No votes yet — use /rank to start scoring!`
        } : null)
    );

    return interaction.editReply({ embeds: embeds.slice(0, 10) });
  }
};
