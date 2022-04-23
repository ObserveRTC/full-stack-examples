const express = require('express');
const path = require('path');
const app = express();
const fs = require('fs');

app.use(express.static(path.join(__dirname, './')));
const roomIds = ["Helsinki", "Stockholm", "Budapest", "Oslo", "London", "Barcelona"];
const roomId = roomIds[Math.ceil(Math.random() * (roomIds.length - 1))];

const roomTemplate = fs.readFileSync(path.join(__dirname, './', 'template.html'), "utf-8").replace("{ROOM_ID}", roomId);
const mediasoupHtml = roomTemplate.replace("{CLIENT_TYPE}", "Mediasoup");

app.get('/', function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(mediasoupHtml);
});

app.listen(9000);