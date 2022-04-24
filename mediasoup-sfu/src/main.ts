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
logger.info(`process.env.GOOGLE_APPLICATION_CREDENTIALS: ${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);

async function main(): Promise<void> {
    const hostname = config.get("hostname");
    const webpagePort = config.getAsNumber("webpagePort");
    const rtcMinPort = config.getAsNumber("rtcMinPort");
    const rtcMaxPort = config.getAsNumber("rtcMaxPort");
    const announcedIp = config.get("announcedIp");
    const observerInternalAddress = config.get("observerInternalAddress");
    const serverIp = config.get("serverIp") ?? await lookup(hostname);
    logger.info("Server IP", serverIp);
    const server = await Server.builder()
        .setPort(webpagePort)
        .setHostname(hostname)
        .setObserverInternalAddress(observerInternalAddress)
        .setServerIp(serverIp)
        .setAnnouncedIp(announcedIp)
        .setRtcMinPort(rtcMinPort)
        .setRtcMaxPort(rtcMaxPort)
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
    await server.start();
}

main()
    .then(() => {
        
    })
    .catch(err => {
    
    });