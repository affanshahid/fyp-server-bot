const Bot = require('slackbots');
const os = require('os');

const { SLACK_BOT_API_KEY } = process.env;
const config = require('./config.json')

const serverBot = new Bot({
  token: SLACK_BOT_API_KEY,
  name: 'server-bot'
});

let botId = undefined;
serverBot.getUser('server-bot', obj => botId = obj.id);

serverBot.on('start', () => {
  serverBot.postMessageToChannel('server-bot-hovel', 'Authenticated');
});

serverBot.on('error', () => {
  serverBot.postMessageToChannel('server-bot-hovel', 'Turning off');
});

serverBot.on('close', () => {
  serverBot.postMessageToChannel('server-bot-hovel', 'Turning off');

});

serverBot.on('message', message => {
  if (isChatMessage(message)) {
    handleChatMessage(message);
  }
});


function handleChatMessage(message) {
  matchCommands(message);
  matchAccountQueries(message);
}

const commands = [{
  regexes: [/^server *ip *\?$/gi],
  action: postIP
},
{
  regexes: [/^server *(host)?name *\?$/gi],
  action: postName
}
];

function matchCommands(message) {
  for (let command of commands) {
    const { regexes, action } = command;
    for (let regex of regexes) {
      if (regex.test(message.text)) {
        action(serverBot, message);
        return;
      }
    }
  }
}

const accountRegex = /^(\w*) *(\w*) *\?$/gi;

function matchAccountQueries(message) {
  const { accounts } = config;
  const match = accountRegex.exec(message.text);
  if (!match) {
    return;
  }
  const keyword = match[1];
  const type = match[2];

  for (let acc in accounts) {
    const accTypes = accounts[acc].types || ['details', 'account'];
    const accKeywords = accounts[acc].keywords;
    if (!accKeywords) {
      throw new Error("Accounts must have keywords: " + acc);
    }
    if (accKeywords.includes(keyword) && accTypes.includes(type)) {
      printAccount(accounts[acc], acc);
    }
  }

  function printAccount(account, name) {
    let m = `${name}\n`;
    m += keyValString('username', account.username);
    m += keyValString('password', account.password);
    if (account.details) {
      for (let detail in account.details) {
        m += keyValString(detail, account.details[detail]);
      }
    }
    serverBot.postMessage(message.channel, m);
  }

  function keyValString(key, val) {
    return `${key}: \`${val}\`\n`;
  }
}

function postIP(bot, message) {
  bot.postMessage(message.channel, `Server IP: \`${getIP()}\``);
}

function postName(bot, message) {
  bot.postMessage(message.channel, `Server hostname: \`${os.hostname()}\``);
}

function isChatMessage(message) {
  return message.type === 'message' && Boolean(message.text);
}


function getIP() {
  const interfaces = os.networkInterfaces();
  for (let k in interfaces) {
    for (let k2 in interfaces[k]) {
      let address = interfaces[k][k2];
      if (address.family === 'IPv4' && !address.internal) {
        return address.address;
      }
    }
  }
}
