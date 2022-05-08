import { Server } from "./Server";
import process from'process';
const os = require('os');

// fetch config
// fetch environment
// setup server
// run
// wait to stop or sigkill

const log4js = require('log4js');
const moduleName = module.filename.slice(__filename.lastIndexOf("/")+1, module.filename.length -3);
const logger = log4js.getLogger(moduleName);
logger.level = 'debug';

const dns = require('dns');
async function lookup(hostname: any): Promise<string> {
    return new Promise((resolve) => {
        dns.lookup(hostname, function(err: any, result: string) {
            resolve(result);
        });
    });
}

const { config } = require("./appconfig");
logger.info("Loaded config", config.getLoadedConfig());
logger.info("Endianess", os.endianness());

async function main(): Promise<void> {
    const hostname = config.get("hostname");
    const websocketPort = config.getAsNumber("websocketPort");
    const rtcMinPort = config.getAsNumber("rtcMinPort");
    const rtcMaxPort = config.getAsNumber("rtcMaxPort");
    const sfuPeerMinPort = config.getAsNumber("sfuPeerMinPort");
    const sfuPeerMaxPort = config.getAsNumber("sfuPeerMaxPort");
    const sfuPeersCsv = config.get("sfuPeers");
    const announcedIp = config.get("announcedIp");
    const observerInternalAddress = config.get("observerInternalAddress");
    const serverIp = config.get("serverIp") ?? await lookup(hostname);
    logger.info("Server IP", serverIp);
    const sfuPeers: [string, string, number][] = [];
    if (sfuPeersCsv) {
        const splittedSfuPeers = sfuPeersCsv.split(",");
        for (const sfuPeer of splittedSfuPeers) {
            const array = sfuPeer.split("@");
            const sfuId = array[0];
            const address = array[1].split(":");
            const host = address[0];
            const port = Number.parseInt(address[1]);
            sfuPeers.push([sfuId, host, port]);
            logger.info(`Adding SfuPeer ${sfuId} at ${address}`);
        }
    }
    const server = await Server.builder()
        .setPort(websocketPort)
        .setHostname(hostname)
        .setObserverInternalAddress(observerInternalAddress)
        .setServerIp(serverIp)
        .setSfuPeers(...sfuPeers)
        .setAnnouncedIp(announcedIp)
        .setRtcMinPort(rtcMinPort)
        .setRtcMaxPort(rtcMaxPort)
        .setSfuPeerMinPort(sfuPeerMinPort)
        .setSfuPeerMaxPort(sfuPeerMaxPort)
        .build();
    process.on('SIGINT', () => {
        server.close();
        setTimeout(() => {
            // if (!server.closed) {
                // logger.info("Timeout elapsed, process exit");
            // }
            process.exit(0);
        }, 3000);
    });
    await server.start().catch(async err => {
        logger.error(`Error occurred while peer sfu communication is being established`, err);
        if (!server.closed) {
            await server.close();
        }
    })
}

main()
    .then(() => {
        
    })
    .catch(err => {
        logger.error(err);
    });