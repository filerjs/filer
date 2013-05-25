define function(require) {

  var _ = require('lodash');

  function Event(type, data) {
    this.type = type;
    this.data = data;
  };

  function EventSource(types) {
    var events = this.events = {};
    _(types).forEach(function(type) {
      events[type] = [];
    });

    this.on = function on(type, callback) {
      if(!_(events).has(type)) {
        throw new Error('unsupported event: ' + type);
      }

      events[type].push(callback);
    };

    this.off = function off(type, callback) {
      if(!_(events).has(type)) {
        throw new Error('unsupported event: ' + type);
      }

      events[type] = _(events[type]).without(callback);
    };

    this.emit = function emit(event) {
      if(!_(events).has(type)) {
        throw new Error('unsupported event: ' + type);
      }

      _(events[type]).forEach(function(callack) {
        callback.call(this, event);
      });
    };
  };

  return {
    Event: Event,
    EventSource: EventSource
  };

};