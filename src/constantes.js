module.exports = {
    Redis: {
        host: "172.17.0.2",
        retry_strategy: function (options) {
            if (options.error && options.error.code === 'ECONNREFUSED') {
                // End reconnecting on a specific error and flush all commands with
                // a individual error
                return new Error('The server refused the connection');
            }
            if (options.total_retry_time > 1000 * 60 * 60) {
                // End reconnecting after a specific timeout and flush all commands
                // with a individual error
                return new Error('Retry time exhausted');
            }
            if (options.attempt > 10) {
                // End reconnecting with built in error
                return undefined;
            }
            // reconnect after
            return Math.min(options.attempt * 100, 3000);
        }
    },
    Status: {
        _500 : {
            message: "Ohoh, something is wrong with the server"
        },
        _404: {
            message: "Post not found :/"
        },
        _400: {
            message: "Missing some fields"
        }
    }
};
