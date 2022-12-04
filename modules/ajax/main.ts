import _config from "../../src/config";

interface data {
    [key: string]: string | number | boolean | Array<any> | null | data;
}

interface config {
    timeout: number;
    datatype: string;
    headers: {
        [key: string]: string;
    };
    shutdown: boolean;
    wait: number;
    failed: Function;
    callback: Function;
    keepalive: boolean;
}

interface selectConfig {
    timeout?: number;
    datatype?: string;
    headers?: {
        [key: string]: string;
    };
    shutdown?: boolean;
    wait?: number;
    failed?: Function;
    callback?: Function;
    keepalive?: boolean;
}

let defaultConfig: config = {
    timeout: _config.modules.ajax.timeout,
    datatype: "auto",
    headers: {},
    shutdown: false,
    wait: 0,
    failed: () => 0,
    callback: () => 0,
    keepalive: false
}

class fastjsAjax {
    private readonly construct: string;
    private waitid: number;

    constructor(url: string, data?: data, config: selectConfig = {}) {
        // merge config -> defaultConfig
        for (let key in config) {
            // @ts-ignore
            if (defaultConfig[key] !== undefined) {
                // @ts-ignore
                defaultConfig[key] = config[key];
            }
        }

        this.url = url;
        this.data = data || {};
        this.config = defaultConfig;
        this.response = null;
        this.xhr = null;
        this.waitid = 0;

        // construct
        this.construct = "fastjsAjax";
    }

    url: string;
    data: {
        [key: string]: string | number | boolean | Array<any> | null | data;
    };
    config: config;
    response: any;
    xhr: XMLHttpRequest | null;

    send(method: string) {
        const config = _config.modules.ajax

        // method to uppercase
        method = method.toUpperCase();
        const next = () => {
            // if xhr and shutdown is true, abort
            if (this.xhr !== null && this.config.shutdown) {
                this.xhr.abort();
            }
            // create xhr
            let xhr = new XMLHttpRequest();
            this.xhr = xhr;
            xhr.open(method, this.url, true);
            xhr.timeout = this.config.timeout;
            const fail = () => {
                // hook
                if (config.hooks.failed(this) === false) return;
                // cut out xhr
                xhr.abort();
                // run failed
                this.config.failed(this);
                // if keepalive
                if (this.config.keepalive) {
                    next();
                }
            }
            // xhr failed
            xhr.onerror = fail;
            xhr.ontimeout = fail;
            // xhr success
            xhr.onload = () => {
                const data = xhr.response;
                // if auto
                if (this.config.datatype === "auto") {
                    // try to parse json
                    try {
                        this.response = JSON.parse(xhr.responseText);
                    } catch {
                        this.response = xhr.responseText;
                    }
                }
                if (config.hooks.success(this) === false) return;
                if (config.hooks.callback(this, data) === false) return;
                this.config.callback(data, this);
                // if keepalive
                if (this.config.keepalive) {
                    next();
                }
            }
            let query = "";
            if (method === "POST") {
                // data to query
                for (let key in this.data) {
                    query += `${key}=${this.data[key]}&`;
                }
            }
            xhr.send(query || null);
        }

        // if wait
        if (this.config.wait > 0) {
            if (this.waitid !== 0) {
                clearTimeout(this.waitid);
            }
            // do debounce
            this.waitid = Number(setTimeout(() => {
                next()
                this.waitid = 0;
            }, this.config.wait));
        } else next()
    }
}

export default fastjsAjax