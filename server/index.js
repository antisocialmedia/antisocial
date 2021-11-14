/*
    antisocial media server
    11/13/21 - parabirb
*/

// dependencies
const fs = require("fs");
const ws = require("ws");
const loki = require("lokijs");
const wsServer = require("./controllers/websocket");
const expressServer = require("./controllers/express");
const { info, misc, error } = require("./logger");

// read our config
const config = require("./config.json");

// log we're initializing the database
info("Initializing database...");

// initialize the database
const database = new loki("database.db");

// load the database
database.loadDatabase({}, () => {
    // get our collection
    let users = database.getCollection("users");
    // if it doesn't exist, start it
    if (users === null) {
        users = database.addCollection("users");
    }
    // start our express server
    info(`Starting Express server on port ${config.port}...`);
    expressServer(config);
    // start our ws server
    info(`Starting WS server on port ${config.webSocketPort}`);
    wsServer(database, users, config);
});