module.exports = {
  encode: string => Buffer.from(string),
  decode: buffer => buffer.toString('utf8')
};
