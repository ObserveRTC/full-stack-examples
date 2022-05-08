const express = require('express');
const path = require('path');
const url = require('url');
const app = express();
const fs = require('fs');
const capitals = ["Sukhumi","Kabul","Episkopi Cantonment","Tirana","Algiers","Pago Pago","Andorra la Vella","Luanda","The Valley","St. John's","Buenos Aires","Yerevan","Oranjestad","Georgetown","Canberra","Vienna","Baku","Nassau","Manama","Dhaka","Bridgetown","Minsk","Brussels","Belmopan","Porto-Novo","Hamilton","Thimphu","Sucre","La Paz","Sarajevo","Gaborone","Brasília","Road Town","Bandar Seri Begawan","Sofia","Ouagadougou","Bujumbura","Phnom Penh","Yaoundé","Ottawa","Praia","George Town","Bangui","N'Djamena","Santiago","Beijing","Flying Fish Cove","West Island","Bogotá","Moroni","Avarua","San José","Zagreb","Havana","Willemstad","Nicosia","Prague","Yamoussoukro","Kinshasa","Copenhagen","Djibouti","Roseau","Santo Domingo","Dili","Hanga Roa","Quito","Cairo","San Salvador","Malabo","Asmara","Tallinn","Addis Ababa","Stanley","Tórshavn","Palikir","Suva","Helsinki","Paris","Cayenne","Papeete","Libreville","Banjul","Tbilisi","Berlin","Accra","Gibraltar","Athens","Nuuk","St. George's","Hagåtña","Guatemala City","St. Peter Port","Conakry","Bissau","Georgetown","Port-au-Prince","Tegucigalpa","Budapest","Reykjavík","New Delhi","Jakarta","Tehran","Baghdad","Dublin","Douglas","Jerusalem","Rome","Kingston","Tokyo","St. Helier","Amman","Astana","Nairobi","Tarawa","Pristina","Kuwait City","Bishkek","Vientiane","Riga","Beirut","Maseru","Monrovia","Tripoli","Vaduz","Vilnius","Luxembourg","Skopje","Antananarivo","Lilongwe","Kuala Lumpur","Malé","Bamako","Valletta","Majuro","Nouakchott","Port Louis","Mexico City","Chisinau","Monaco","Ulaanbaatar","Podgorica","Plymouth","Rabat","Maputo","Naypyidaw","Stepanakert","Windhoek","Yaren","Kathmandu","Amsterdam","Nouméa","Wellington","Managua","Niamey","Abuja","Alofi","Kingston","Pyongyang","Nicosia","Belfast","Saipan","Oslo","Muscat","Islamabad","Ngerulmud","Jerusalem","Panama City","Port Moresby","Asunción","Lima","Manila","Adamstown","Warsaw","Lisbon","San Juan","Doha","Taipei","Brazzaville","Bucharest","Kigali","Gustavia","Jamestown","Basseterre","Castries","Marigot","St. Pierre","Kingstown","Apia","San Marino","Riyadh","Edinburgh","Dakar","Belgrade","Victoria","Freetown","Singapore","Philipsburg","Bratislava","Ljubljana","Honiara","Mogadishu","Hargeisa","Pretoria","Grytviken","Seoul","Tskhinvali","Juba","Madrid","Sri Jayawardenapura Kotte","Khartoum","Paramaribo","Mbabane","Stockholm","Bern","Damascus","São Tomé","Dushanbe","Dodoma","Bangkok","Lomé","Nukuʻalofa","Tiraspol","Port of Spain","Edinburgh of the Seven Seas","Tunis","Ankara","Ashgabat","Cockburn Town","Funafuti","Kampala","Kyiv","Abu Dhabi","London","Washington, D.C.","Charlotte Amalie","Montevideo","Tashkent","Port Vila","Vatican City","Caracas","Hanoi","Cardiff","Mata-Utu","El Aaiún","Sanaá","Lusaka","Harare"];

app.use(express.static(path.join(__dirname, './')));
const roomId = capitals[Math.ceil(Math.random() * (capitals.length - 1))];

const roomTemplate = fs.readFileSync(path.join(__dirname, './', 'template.html'), "utf-8").replace("{ROOM_ID}", roomId);
const mediasoupHtml = roomTemplate.replace("{CLIENT_TYPE}", "Mediasoup");

app.get('/', function (req, res) {
  const query = url.parse(req.url, true).query;
  const clientPage = mediasoupHtml
    .replace("{SFU_HOST}", query?.sfuHost ?? "localhost")
    .replace("{SFU_PORT}", query?.sfuPort ?? 5959);
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.end(clientPage);
});

app.listen(9000);