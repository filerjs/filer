module.exports = {
    type: 'object',
    properties: {
        filerDir: {
            type: 'string',
        },
        shimsDir: {
            type: 'string',
        },
        shimFs: {
            type: 'boolean',
        },
        shimPath: {
            type: 'boolean',
        },
        shimBuffer: {
            type: 'boolean',
        },
        fsProvider: {
            type: 'string',
        },
        fsProviderDir: {
            type: 'string',
        },
    }
};
