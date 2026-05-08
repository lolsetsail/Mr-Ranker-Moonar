const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// =====================
// CONFIG
// =====================
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const LEADERBOARD_CHANNEL_ID = process.env.LEADERBOARD_CHANNEL_ID;

// 👑 OWNER USER ID
const OWNER_ID = "YOUR_USER_ID_HERE";

// 🔐 ALLOWED ROLES
const ALLOWED_ROLES = [
  "ROLE_ID_1",
  "ROLE_ID_2"
];

// =====================
// BOT
// =====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// DATA
// =====================
let players = [];

// =====================
// PERMISSION CHECK
// =====================
function hasPermission(member) {
  // 👑 OWNER BYPASS
  if (member.user.id === OWNER_ID) {
    return true;
  }

  // 🔐 ROLE CHECK
  return member.roles.cache.some(role =>
    ALLOWED_ROLES.includes(role.id)
  );
}

// =====================
// FORMAT LEADERBOARD
// =====================
function formatLeaderboard(list) {
  if (list.length === 0) {
    return `🏆 **Moonar Empire Leaderboards** 🏆

No players yet.`;
  }

  return `🏆 **Moonar Empire Leaderboards** 🏆

` +
    list
      .map((p, i) => `**#${i + 1}** <@${p.id}>`)
      .join("\n") +
    `

🔥 Rise through the ranks.`;
}

// =====================
// COMMANDS
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("Add player (last place)")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Player")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("move")
    .setDescription("Move player to rank #")
    .addUserOption(opt =>
      opt.setName("user")
        .setDescription("Player")
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName("position")
        .setDescription("Rank position")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("send")
    .setDescription("Send leaderboard"),

  new SlashCommandBuilder()
    .setName("restart")
    .setDescription("Reset leaderboard")
    .addStringOption(opt =>
      opt.setName("confirm")
        .setDescription("Type YES")
    ),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Clear bot messages")
    .addIntegerOption(opt =>
      opt.setName("amount")
        .setDescription("Message count (max 100)")
    ),

  new SlashCommandBuilder()
    .setName("about")
    .setDescription("About bot")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

// =====================
// REGISTER COMMANDS
// =====================
async function registerCommands() {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );

  console.log("Slash commands registered");
}

// =====================
// HANDLER
// =====================
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const member = interaction.member;

  // 🔐 PERMISSION CHECK
  if (!hasPermission(member)) {
    return interaction.reply({
      content: "❌ You don't have permission to use this bot.",
      ephemeral: true
    });
  }

  // ➕ ADD
  if (interaction.commandName === "add") {
    const user = interaction.options.getUser("user");

    players.push({
      id: user.id,
      rank: players.length + 1
    });

    return interaction.reply(`✅ Added <@${user.id}> to last place`);
  }

  // 🔁 MOVE
  if (interaction.commandName === "move") {
    const user = interaction.options.getUser("user");
    let position = interaction.options.getInteger("position");

    const index = players.findIndex(p => p.id === user.id);

    if (index === -1) {
      return interaction.reply("❌ Player not found");
    }

    const [player] = players.splice(index, 1);

    position = Math.max(1, Math.min(position, players.length + 1));

    players.splice(position - 1, 0, player);

    players.forEach((p, i) => p.rank = i + 1);

    return interaction.reply(`🔁 Moved <@${user.id}> to **#${position}**`);
  }

  // 📢 SEND
  if (interaction.commandName === "send") {
    const channel = client.channels.cache.get(LEADERBOARD_CHANNEL_ID);

    if (!channel) {
      return interaction.reply("❌ Channel not found");
    }

    await channel.send(formatLeaderboard(players));

    return interaction.reply({
      content: "📢 Leaderboard sent!",
      ephemeral: true
    });
  }

  // 💥 RESTART
  if (interaction.commandName === "restart") {
    const confirm = interaction.options.getString("confirm");

    if (confirm !== "YES") {
      return interaction.reply("⚠ Use `/restart confirm:YES`");
    }

    players = [];

    return interaction.reply("💥 Leaderboard reset");
  }

  // 🧹 CLEAR
  if (interaction.commandName === "clear") {
    const amount = interaction.options.getInteger("amount") || 50;

    if (amount > 100) {
      return interaction.reply("❌ Max 100 messages");
    }

    const messages = await interaction.channel.messages.fetch({
      limit: amount
    });

    const botMessages = messages.filter(
      m => m.author.id === client.user.id
    );

    await interaction.channel.bulkDelete(botMessages, true);

    return interaction.reply({
      content: `🧹 Cleared ${botMessages.size} bot messages`,
      ephemeral: true
    });
  }

  // ℹ ABOUT
  if (interaction.commandName === "about") {
    return interaction.reply(
      "📊 **Moonar Empire Leaderboard Bot**\n\n" +
      "A bot to handle Moonar’s leaderboard,\n" +
      "developed by **lolsetsail**."
    );
  }
});

// =====================
// READY
// =====================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// =====================
// START
// =====================
registerCommands().then(() => {
  client.login(TOKEN);
});
