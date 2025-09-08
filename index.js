/**
 * DANUU-MD WhatsApp Bot - Final Complete Code
 *
 * This file contains all the necessary code and commands to run your bot.
 * It includes all the features requested by the user:
 * - Basic Commands: !start, !ping, !help, !info
 * - Fun Commands: !sticker, !quote
 * - Automation Features: Auto Status View, Auto Reply, Auto React
 *
 * To fix the QR code issue, the 'qrcode-terminal' library has been added.
 *
 * Steps to run this code:
 * 1. Make sure you have Node.js installed on your computer.
 * 2. Create a new folder for your project and open your terminal inside that folder.
 * 3. Run the following commands to initialize your project and install libraries:
 * `npm init -y`
 * `npm install @whiskeysockets/baileys pino qrcode-terminal`
 * 4. Save this file as `index.js` in your project folder.
 * 5. Start the bot from your terminal by running:
 * `node index.js`
 * 6. Follow the instructions to scan the QR code and link your device.
 */

const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    proto
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const {
    Boom
} = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

// Function to start the bot
async function startBot() {
    // Load authentication credentials
    const {
        state,
        saveCreds
    } = await useMultiFileAuthState('auth_info_baileys');

    // Fetch the latest version of Baileys
    const {
        version
    } = await fetchLatestBaileysVersion();
    console.log(`Using Baileys version: ${version.join('.')}`);

    const sock = makeWASocket({
        logger: pino({
            level: 'silent'
        }),
        auth: state,
        browser: ['DANUU-MD', 'Chrome', '1.0.0'],
        version
    });

    // Event handler for connection updates
    sock.ev.on('connection.update', async (update) => {
        const {
            connection,
            lastDisconnect,
            qr
        } = update;

        if (qr) {
            console.log('Scan this QR code with your WhatsApp app to link your device:');
            qrcode.generate(qr, {
                small: true
            });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Connection closed. Reconnecting:', shouldReconnect);

            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            console.log('Connection is open! The DANUU-MD bot is now online.');
        }
    });

    // Save credentials when they are updated
    sock.ev.on('creds.update', saveCreds);

    // --- Automation Feature: Auto Status View ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        // Check if the message is a status update from someone else
        if (msg.key.remoteJid === 'status@broadcast' && !msg.key.fromMe) {
            console.log(`New status update from ${msg.key.participant || msg.key.remoteJid}, auto-viewing...`);
            // Mark the status as read
            await sock.readMessages([msg.key]);
        }
    });

    // --- Main Message Handler ---
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];

        if (!msg.key.fromMe && m.type === 'notify' && msg.message) {
            const remoteJid = msg.key.remoteJid;
            const messageText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
            const lowerCaseText = messageText.toLowerCase();

            console.log(`Received a message from ${remoteJid}: ${messageText}`);
            
            // --- Automation Feature: Auto React ---
            // React to every message, except for commands that need a specific action.
            if (!lowerCaseText.startsWith('!') && !msg.key.remoteJid.endsWith('status@broadcast')) {
                await sock.sendMessage(remoteJid, {
                    react: {
                        text: '👍', // You can change this emoji
                        key: msg.key
                    }
                });
            }

            // --- Auto Reply Feature ---
            if (lowerCaseText === 'hello') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hi! I\'m DANUU-MD bot.*'
                });
            } else if (lowerCaseText === 'hi') {
                await sock.sendMessage(remoteJid, {
                    text: '*Hello! How can I help you today?*'
                });
            }

            // --- Other Commands ---
            // Command: !start
            if (lowerCaseText === '!start') {
                const startMessage = `
හලෝ! මම DANUU-MD Bot.
මම මගේ නිර්මාතෘ විසින් විශේෂයෙන් නිර්මාණය කරන ලද්දේ ඔබ වෙනුවෙන් සේවය කිරීමටයි. මගේ සියලු විධාන ලැයිස්තුව බැලීමට !help ටයිප් කරන්න.
                `;
                await sock.sendMessage(remoteJid, {
                    text: startMessage
                });
            }

            // Command: !ping
            if (lowerCaseText === '!ping') {
                await sock.sendMessage(remoteJid, {
                    text: 'Pong!'
                });
            }

            // Command: !help (updated with all commands)
            if (lowerCaseText === '!help') {
                const helpMessage = `
*DANUU-MD Bot Commands:*
* !start: Bot එක පටන් ගන්න.
* !ping: Bot එක online ද කියලා බලන්න.
* !help: මේ commands ලැයිස්තුව බලන්න.
* !info: Bot එක ගැන විස්තර දැනගන්න.
* !sticker: Image එකකට reply කරලා sticker එකක් හදන්න.
* !quote: Random quote එකක් ගන්න.
                `;
                await sock.sendMessage(remoteJid, {
                    text: helpMessage
                });
            }

            // Command: !info
            if (lowerCaseText === '!info') {
                const infoMessage = `Hello, I'm the DANUU-MD bot. I was created with the Baileys library to automate tasks on WhatsApp.`;
                await sock.sendMessage(remoteJid, {
                    text: infoMessage
                });
            }

            // Command: !sticker
            if (lowerCaseText === '!sticker' && msg.message?.imageMessage) {
                const media = await proto.Message.fromObject(msg.message).imageMessage;
                const buffer = await sock.downloadMediaMessage(media);
                await sock.sendMessage(remoteJid, {
                    sticker: buffer
                });
            }

            // Command: !quote
            if (lowerCaseText === '!quote') {
                const quotes = [
                    "The only way to do great work is to love what you do. - Steve Jobs",
                    "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
                    "The best way to predict the future is to create it. - Peter Drucker",
                    "Do not wait for a perfect time. Take the moment and make it perfect. - Sri Chinmoy",
                ];
                const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
                await sock.sendMessage(remoteJid, {
                    text: randomQuote
                });
            }
        }
    });
}

// Start the bot
startBot();
