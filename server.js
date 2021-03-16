require("dotenv").config();
const express = require('express');
const http = require('http');
const fs = require('fs');
const WebSocket = require('ws');
const Sentiment = require('sentiment');

const app = express();
const server = http.createServer(app);

app.use(express.static('public'));

const port = process.env.PORT || process.env.LOCAL_PORT;

server.listen(port, () => {
  console.log('Running server on port %s', port);
});

function establishSocketConnection(){

  let socketUrl =  "ws://77.68.114.90:4000";
  const dws = new WebSocket(socketUrl);

  dws.on('open', () => {

    const wss = new WebSocket.Server({ server });

    wss.on('connection', ws => {

      console.log("New connection detected from browser");

      ws.on('message', arrayBuffer => {
          dws.send(arrayBuffer);
      });

      ws.on('close', () => {
        console.log("Web socket connection to browser closed");
      });

      dws.on('message',(data) => {
        console.log(data);
        ws.send(data);
      });

      dws.on("close", () => {
        //establishSocketConnection();
      });
    });


    console.log("Websocket connection to deep speech open");
  });
}

establishSocketConnection();