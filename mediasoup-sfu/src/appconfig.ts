interface ConfigEntryBuilder {
    withKey(value: string): this;
    withArg(value: string): this;
    withEnvVariable(value: string): this;
    withFormat(value: string): this;
    withDefaultValue(value: string): this;
    withDoc(value: string): this;
    build(): ConfigEntry;
}

class ConfigEntry {
    static builder(): ConfigEntryBuilder {
        const entry = new ConfigEntry();
        const result: ConfigEntryBuilder = {
            withKey: (value: string) => {
                entry._key = value;
                return result;
            },
            withArg: (value: string) => {
                entry._arg = value;
                return result;
            },
            withEnvVariable: (value: string) => {
                entry._env = value;
                return result;
            },
            withFormat: (value: string) => {
                entry._env = value;
                return result;
            },
            withDefaultValue: (value: string) => {
                entry._defaultValue = value;
                return result;
            },
            withDoc: (value: string) => {
                entry._doc = value;
                return result;
            },
            build: () => {
                if (entry.key === null) {
                    throw new Error(`Cannot make an entry without a key`);
                }
                return entry;
            },
        };
        return result;
    }

    private _env: string | null = null;
    private _arg: string | null = null;
    private _format: string | null = null;
    private _key: string | null = null;
    private _defaultValue: string | null = null;
    private _doc: string = "";
    private constructor() {

    }

    public get env() {
        return this._env;
    }

    public get arg() {
        return this._arg;
    }

    public get format() {
        return this._format;
    }

    public get key(): string {
        return this._key!;
    }

    public get defaultValue() {
        return this._defaultValue;
    }

    public get doc() {
        return this._doc;
    }
}


interface Builder {
    withConfigEntry(value: ConfigEntry): this;
    build(): ConfigProcessor;
}

class ConfigProcessor {
    static from(obj: any): ConfigProcessor {
        if (!obj || typeof obj !== 'object') {
            throw new Error(`Cannot interpret an object of nothing`);
        }
        const configBuilder = ConfigProcessor.builder();
        for (const [key, config] of Object.entries(obj)) {
            const { doc, format, defaultValue, env, arg }: { 
                doc: string | null | undefined, 
                format: string | null | undefined,
                defaultValue: string | null | undefined,
                env: string | null | undefined,
                arg: string | null | undefined, 
            } = config as any;
            const entryBuilder = ConfigEntry.builder();
            if (key) entryBuilder.withKey(key);
            if (doc) entryBuilder.withDoc(doc);
            if (format) entryBuilder.withFormat(format);
            if (defaultValue) entryBuilder.withDefaultValue(defaultValue);
            if (env) entryBuilder.withEnvVariable(env);
            if (arg) entryBuilder.withArg(arg);
            const entry = entryBuilder.build();
            configBuilder.withConfigEntry(entry);
        }
        const result = configBuilder.build();
        return result;
    }
    static builder(): Builder {
        const configEntries: Map<string, ConfigEntry> = new Map<string, ConfigEntry>();
        const config = new ConfigProcessor();
        const result: Builder = {
            withConfigEntry: (value: ConfigEntry): Builder => {
                if (configEntries.has(value.key)) {
                    throw new Error(`Config with key ${value.key} is already defined`);
                }
                configEntries.set(value.key, value);
                return result;
            },
            build: () => {
                const docs = ["Configuration"];
                const argv = require('yargs-parser')(process.argv.slice(2));
                for (const [configKey, configEntry] of configEntries.entries()) {
                    let value: string | null | undefined = configEntry.env ? process.env[configEntry.env!] : null;
                    const argKey = configEntry.arg ?? configKey;
                    if (!value) {
                        value = argv[argKey];
                        if (!value) {
                            value = configEntry.defaultValue
                            if (value === undefined) {
                                throw new Error(`Cannot make config, because ${argKey} for ${configKey} missing value, which is defined as mandatory`);
                            }
                        }
                    }
                    if (value !== null) {
                        config._values.set(configKey, value);
                    }
                    docs.push(`\t${argKey}\t\t${configEntry.doc}`);
                }
                config._docs = docs.join("\n");
                return config;
            },
        };
        return result;
    }
    private _docs: string = "";
    private _values: Map<string, string> = new Map<string, string>();
    constructor() {
        
    }

    public has(key: string) {
        return this._values.has(key);
    }

    public get(key: string): string | undefined {
        return this._values.get(key);
    }

    public getAsNumber(key: string, radix?: number): number | undefined {
        const value = this._values.get(key);
        if (value === undefined) {
            return undefined;
        }
        const result: number = parseInt(value, radix);
        return result;
    }

    public getLoadedConfig(): string {
        const result = [];
        for (const [key, value] of this._values) {
            result.push(`\t${key}: \"${value}\"`);
        }
        return "\n" + result.join(`\n`);
    }

    public get help() {
        return this._docs;
    }
}

export const config = ConfigProcessor.from({
    env: {
        doc: 'The application environment.',
        format: ['prod', 'dev', 'test'],
        defaultValue: 'dev',
        env: 'NODE_ENV'
    },
    logLevel: {
        doc: 'The level of logs',
        format: ['debug', 'info', 'warn'],
        defaultValue: 'info',
        env: 'LOG_LEVEL',
        arg: 'logLevel',
    },
    hostname: {
        doc: 'The hostname of the machine',
        defaultValue: 'localhost',
        env: 'HOSTNAME',
        arg: 'hostname',
    },
    mediaUnitId: {
        doc: 'the media unit id propagated to the observer when the sfu is connected',
        defaultValue: 'mediasoup-sfu',
        env: 'MEDIA_UNIT_ID',
        arg: 'mediaUnitId',
    },
    serviceId: {
        doc: 'the service id propagated to the observer when the sfu is connected',
        defaultValue: 'myService',
        env: 'SERVICE_ID',
        arg: 'serviceId',
    },
    outboundLatencyInMs: {
        doc: 'Give a shell command to tc to set a latency for the outbound packets',
        format: "number",
        defaultValue: undefined,
        env: 'OUTBOUND_LATENCY_IN_MS',
        arg: 'outboundLatencyInMs',
    },
    websocketPort: {
        doc: 'The port number for the websocket the server provide to listen',
        format: "number",
        defaultValue: '5959',
        env: 'WEBSOCKET_PORT',
        arg: 'websocketPort',
    },
    rtcMinPort: {
        doc: 'The min rtc port for the mediasoup',
        format: "number",
        defaultValue: '5000',
        env: 'RTCMIN_PORT',
        arg: 'rtcMinPort',
    },
    rtcMaxPort: {
        doc: 'The max rtc port for the mediasoup',
        format: "number",
        defaultValue: '5900',
        env: 'RTCMAX_PORT',
        arg: 'rtcMaxPort',
    },
    sfuPeerMinPort: {
        doc: 'The min sfu peer port for the mediasoup',
        format: "number",
        defaultValue: '6000',
        env: 'SFUPEER_MIN_PORT',
        arg: 'sfuPeerMinPort',
    },
    sfuPeerMaxPort: {
        doc: 'The max sfu peer port for the mediasoup',
        format: "number",
        defaultValue: '6100',
        env: 'SFUPEER_MAX_PORT',
        arg: 'sfuPeerMaxPort',
    },
    sfuPeers: {
        doc: 'a comma separated value of the sfu peer addresses',
        format: "string",
        defaultValue: null,
        env: 'SFU_PEERS',
        arg: 'sfupeers',
    },
    announcedIp: {
        doc: 'The announed IP address',
        format: "string",
        defaultValue: null,
        env: 'ANNOUNCED_IP',
        arg: 'announcedIp',
    },
    serverIp: {
        doc: 'The server IP address',
        format: "string",
        defaultValue: null,
        env: 'SERVER_IP',
        arg: 'serverIp',
    },
    observerInternalAddress: {
        doc: 'The observer internal address inside the network where the observer relies',
        format: "string",
        defaultValue: "localhost:7080",
        env: 'OBSERVER_INTERNAL_ADDRESS',
        arg: 'observerInternalAddress',
    }
})