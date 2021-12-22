/*
    antisocial client
*/

const { app, BrowserWindow } = require("electron");

function createWindow() {
    const window = new BrowserWindow({
        width: 800,
        height: 600
    });
    window.loadFile("src/index.html");
    window.removeMenu();
}

app.whenReady().then(createWindow);