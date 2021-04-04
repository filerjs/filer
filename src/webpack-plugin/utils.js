var { validate } = require('schema-utils');

function validateOptions(options, schema) {
  validate(schema, options);
}

function processOptions(options, processors) {
  const processedOptions = {};
    
  for (const [property, processor] of Object.entries(processors)) {
    processedOptions[property] = options[property];
    if (processedOptions[property] === undefined) {
      processedOptions[property] = processor.default;
    }
    if (processor.process) {
      processedOptions[property] = processor.process(processedOptions[property]);
    }
  }

  return processedOptions;
}

module.exports = {
  validateOptions,
  processOptions,
};
