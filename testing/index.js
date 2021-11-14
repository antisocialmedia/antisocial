/*
    antisocial testing suite
    parabirb - 11/14/21
*/

// deps
const fs = require("fs");
const { WebSocket } = require("ws");
let tweetnacl = require("tweetnacl");
tweetnacl.auth = require("tweetnacl-auth");
tweetnacl.util = require("tweetnacl-util");
const { info, misc, error } = require("../server/logger");

// config
const config = require("./config.json");
let localstorage = JSON.parse(fs.readFileSync("localstorage"));

// introduce ourselves to the user
console.log(`antisocial testing suite
tests various things in antisocial to make sure that it functions properly`);

// notify the user we're connecting
info(`Connecting to websocket server, port ${config.webSocketPort}...`);
// establish our connection to the socket
const ws = new WebSocket(`ws://localhost:${config.webSocketPort}`);
// start our websocket state
let state = {
    authenticated: false,
    connected: false
};

// localstorage saver
const saveLocalStorage = () => fs.writeFileSync("localstorage", JSON.stringify(localstorage));
// message sender
const sendMessage = (message) => ws.send(JSON.stringify({message}));

ws.on("open", () => {
    // log our socket opening
    info("Socket has opened!");
});

ws.on("message", (msg) => {
    // parse our message
    const { message } = JSON.parse(msg);
    // inform the user of the message
    info(`A message was received from the server. It is as follows: ${JSON.stringify(message)}`);
    // check the message type
    if (message.type === "connected") {
        // if we're connected, log the connection and save the new state
        info("Successful connection established to server.");
        state.connected = true;
        // authenticate to the server
        if (localstorage.user !== undefined) {
            // todo
        }
        else {
            // set our username and password if it doesn't already exist
            info("Username and password have been generated.");
            localstorage.user = "amongUsASMR";
            localstorage.password = "antisocial testing 2021!";
        }
        // set our state's username, password, and keys
        state.user = localstorage.user;
        state.password = localstorage.password;
        state.key = tweetnacl.hash(tweetnacl.util.decodeUTF8(state.password)).slice(0, 32);
        info("Username, password, and key have been saved to state.");
        // if we're registered
        if (localstorage.registered !== undefined) {
            // send a log in message
            sendMessage({
                type: "authenticate",
                contents: {
                    name: state.user,
                    password: state.password
                }
            });
        }
        // otherwise
        else {
            // generate the required keys
            let rawIdentityKey = tweetnacl.box.keyPair();
            let iKeyNonce = tweetnacl.randomBytes(24);
            let encodedIdentityKey = {
                publicKey: tweetnacl.util.encodeBase64(rawIdentityKey.publicKey),
                secretKey: {
                    encrypted: tweetnacl.util.encodeBase64(tweetnacl.secretbox(rawIdentityKey.secretKey, iKeyNonce, state.key)),
                    nonce: tweetnacl.util.encodeBase64(iKeyNonce)
                }
            };
            // inform the user we've generated identity key
            info("Identity key has been generated.");
            let encodedHandshakeKeys = [];
            // generate 500 handshake keys
            for (let i = 0; i < 500; i++) {
                // generate key and encode it
                let rawKey = tweetnacl.box.keyPair();
                let keyNonce = tweetnacl.randomBytes(24);
                let encodedKey = {
                    publicKey: tweetnacl.util.encodeBase64(rawKey.publicKey),
                    secretKey: {
                        encrypted: tweetnacl.util.encodeBase64(tweetnacl.secretbox(rawKey.secretKey, keyNonce, state.key)),
                        nonce: tweetnacl.util.encodeBase64(keyNonce)
                    }
                };
                // push it
                encodedHandshakeKeys.push(encodedKey);
            }
            // inform the user we've generated our handshake keys
            info("Handshake keys have been generated.");
            // send the registration message
            sendMessage({
                type: "register",
                contents: {
                    name: state.user,
                    password: state.password,
                    identityKey: encodedIdentityKey,
                    handshakeKeys: encodedHandshakeKeys
                }
            });
        }
    }
    else if (message.type === "authenticated") {
        // inform the user
        info("Client has been authenticated.");
        // set localstorage.registered to true if it was undefined
        if (localstorage.registered === undefined) {
            localstorage.registered = true;
        }
        // authenticate
        state.authenticated = true;
        // save localstorage
        saveLocalStorage();
    }
});