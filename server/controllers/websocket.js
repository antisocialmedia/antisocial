/*
    websocket server for antisocial
    this is where the meat is
*/

// deps
const argon2 = require("argon2");
const { WebSocketServer } = require("ws");
const { performance } = require("perf_hooks");
const { info, misc, error } = require("../logger");

/*
    argon2 options.
    argon2 is our password hashing function, please don't change this.
    ~parabirb
    this config was determined using the argon2-cffi CLI and the recommended
    procedure and runs at 301ms on my computer (ryzen 5 4600g, 12gb ram)
    https://argon2-cffi.readthedocs.io/en/stable/cli.html
*/
const argon2Opts = {
    /*
        argon2d provides gpu resistance but is vulnerable to side-channels.
        since we will probably be running on shared servers, this is not an option.
        argon2i provides less gpu resistance but is less vulnerable to side-channels.
        argon2id takes a hybrid approach between the two.
        therefore, we use argon2id for security reasons.
    */
    type: argon2.argon2id,
    /*
        recommended by the argon2 designers (https://raw.githubusercontent.com/P-H-C/phc-winner-argon2/master/argon2-specs.pdf)
    */
    saltLength: 16,
    /*
        in my personal opinion, 128 bits isn't enough. we go with 256 bits instead.
    */
    hashLength: 32,
    /*
        this should run fine on the average desktop computer (69 MiB)
    */
    memoryCost: 70656,
    /*
        8 threads (this should work fine on most desktop computers, as mentioned earlier)
    */
    parallel: 8,
    /*
        double the default time cost for funsies
    */
    timeCost: 6
};

/*
    as recommended by the ws package
*/
function heartbeat() {
    this.isAlive = true;
}

/*
    our websocket server
*/
async function wsServer(database, users, config) {
    // first, we need to check our argon2 performance so it runs properly.
    misc("Checking argon2 performance...");
    // run our argon2 performance check routine
    await (async () => {
        // get our time
        let x = performance.now();
        // hash a random string with our opts
        misc(`argon2 output: ${await argon2.hash("antisocial team - argon2 test - 2021", argon2Opts)}`);
        // get our time again
        let y = performance.now();
        // log our performance
        misc(`Hash took ${Math.round(y - x)}ms. ${require("chalk").bold("Anything larger than a few thousand milliseconds will be inconvenient for the user.")}`);
    })();
    // start our websocket server
    const wss = new WebSocketServer({
        port: config.webSocketPort
    });
    // inform the user
    info("The WS server has been started.");
    // our user array
    let userList = [];
    // on connection
    wss.on("connection", (ws) => {
        // log our connection
        info("New connection established on WS!");
        // notify the user we connected
        ws.send(JSON.stringify({
            message: {
                type: "connected",
                contents: "A successful connection has been established to the antisocial server."
            }
        }));
        // set our properties
        ws.antisocial = {
            authenticated: false,
            user: null
        }
        // start our heartbeat
        ws.isAlive = true;
        ws.on("pong", heartbeat);
        // when we receive a message
        ws.on("message", async (msg) => {
            try {
                // parse the message
                let { message } = JSON.parse(msg);
                if (!ws.antisocial.authenticated) {
                    if (message.type === "authenticate") {
                        // first we should check to make sure the user isn't already logged in
                        if (userList.indexOf(message.contents.name) !== -1) {
                            ws.send(JSON.stringify({
                                message: {
                                    type: "error",
                                    contents: "You are already logged in on another device."
                                }
                            }));
                        }
                        // second we should check that the user exists
                        else if (users.findOne({ name: message.contents.name }) !== null) {
                            // let's set a user object
                            let user = users.findOne({ name: message.contents.name });
                            // next we should verify the hash present with the password
                            if (await argon2.verify(user.password, message.contents.password)) {
                                // authenticate them
                                ws.antisocial.authenticated = true;
                                ws.antisocial.user = message.contents.name;
                                // push them to the user list
                                userList.push(message.contents.name);
                                // send them a message
                                ws.send(JSON.stringify({
                                    message: {
                                        type: "authenticated",
                                        contents: "You were logged in successfully!"
                                    }
                                }));
                            }
                        }
                        else {
                            ws.send(JSON.stringify({
                                message: {
                                    type: "error",
                                    contents: "That user doesn't exist."
                                }
                            }));
                        }
                    }
                    else if (message.type === "register") {
                        // first we should check the types
                        if (typeof message.contents.name !== "string" || typeof message.contents.password !== "string" || typeof message.contents.identityKey !== "object" || typeof message.contents.handshakeKeys !== "object") {
                            throw new Error("Message type/expected type mismatch");
                        }
                        // if a user with the username doesn't exist
                        if (users.findOne({ name: message.contents.name }) === null) {
                            // hash the password
                            let hash = await argon2.hash(message.contents.password, argon2Opts);
                            // insert the user into our database
                            users.insert({
                                name: message.contents.name,
                                password: hash,
                                identityKey: message.contents.identityKey,
                                handshakeKeys: message.contents.handshakeKeys,
                                friends: []
                            });
                            // save the database
                            database.save();
                            // push them to our signed in list
                            userList.push(message.contents.name);
                            // authenticate them
                            ws.antisocial.authenticated = true;
                            ws.antisocial.user = message.contents.name;
                            // notify them
                            ws.send(JSON.stringify({
                                message: {
                                    type: "authenticated",
                                    contents: "Your registration was successful!"
                                }
                            }))
                        }
                        else {
                            // notify them that it already exists
                            ws.send(JSON.stringify({
                                message: {
                                    type: "error",
                                    contents: "That user already exists."
                                }
                            }));
                        }
                    }
                    else {
                        // notify them that they aren't authenticated
                        ws.send(JSON.stringify({
                            message: {
                                type: "error",
                                contents: "You are not logged in."
                            }
                        }));
                    }
                }
                // if we're authenticated
                else {
                    // if they want to get their state
                    if (message.type === "retrieve-state") {
                        // send them their state
                        ws.send(JSON.stringify({
                            message: {
                                type: "state",
                                contents: users.findOne({ name: ws.antisocial.user })
                            }
                        }));
                    }
                    // if we don't recognize their command
                    else {
                        // notify them we don't recognize their command
                        ws.send(JSON.stringify({
                            message: {
                                type: "error",
                                contents: "Command not recognized."
                            }
                        }));
                    }
                }
            }
            // if we get an error
            catch (e) {
                /*
                    todo:
                    when actual protocol is implemented, we should make sure double-ratchet state
                    gets saved if such an error happens.
                */
                // log our error
                error("Something went wrong with a user and we have to get rid of them.");
                // remove our user from the gene pool
                if (ws.antisocial.user !== null) {
                    userList.splice(userList.indexOf(ws.antisocial.user), 1);
                }
                // notify them an error happened and we have to close
                ws.send(JSON.stringify({
                    message: {
                        type: "error",
                        contents: `An error occured and you must be disconnected. Sorry! Technical details: ${e}`
                    }
                }));
                // close it
                ws.close();
            }
            // on close
            ws.on("close", () => {
                info("Connection disconnected on WS.")
                // remove them from the user list
                if (ws.antisocial.user !== null) {
                    userList.splice(userList.indexOf(ws.antisocial.user), 1);
                }
            });
        });
    });

    // ping our clients every 30 seconds
    const interval = setInterval(() => {
        // for each client
        wss.clients.forEach((ws) => {
            // if it isn't alive, terminate it
            if (!ws.isAlive) {
                // also if it's authenticated, remove the user from the list
                if (ws.antisocial.user !== null) {
                    userList.splice(userList.indexOf(ws.antisocial.user), 1);
                }
                ws.terminate();
            }
            ws.isAlive = false;
            ws.ping();
        });
    }, 30000);

    // when the server closes, clear the interval
    wss.on("close", () => clearInterval(interval));
}

module.exports = wsServer;