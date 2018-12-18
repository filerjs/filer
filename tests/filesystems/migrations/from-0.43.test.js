const expect = require('chai').expect;
const Filer = require('../../../src');
const SerializableMemoryProvider = require('../../lib/serializable-memory-provider');
const nodeFs = require('fs');
const nodePath = require('path');

describe('Migration tests from Filer 0.43 to current', () => {

  let filerFs;

  before(done => {
    // Let the provider parse the JSON
    const imagePath = nodePath.resolve(__dirname, '../images/tiny-fs.0.43.json');
    nodeFs.readFile(imagePath, 'utf8', (err, data) => {
      if(err) throw err;

      new Filer.FileSystem({
        provider: new SerializableMemoryProvider('0.43', data)
      }, (err, fs) => {
        if(err) throw err;

        filerFs = fs;
        done();
      });
    });
  });

  it('should have a root directory', done => {
    filerFs.stat('/', (err, stats) => {
      if(err) throw err;

      expect(stats).to.be.an('object');
      expect(stats.isDirectory()).to.be.true;
      done();
    });
  });

  it('should have expected entries in root dir', done => {
    filerFs.readdir('/', (err, entries) => {
      if(err) throw err;

      expect(entries).to.be.an('array');
      expect(entries.length).to.equal(3);
      expect(entries).to.contain('README.md');
      expect(entries).to.contain('file.txt');
      expect(entries).to.contain('dir');
      done();
    });
  });

  it('should have correct contents for /file.txt (read as String)', done => {
    const fileTxtPath = nodePath.resolve(__dirname, '../tiny-fs/file.txt');

    nodeFs.readFile(fileTxtPath, 'utf8', (err, nodeData) => {
      if(err) throw err;

      filerFs.readFile('/file.txt', 'utf8', (err, filerData) => {
        if(err) throw err;
  
        expect(nodeData).to.equal(filerData);
        done();
      });  
    });
  });

  it('should have expected entries in /dir', done => {
    filerFs.readdir('/dir', (err, entries) => {
      if(err) throw err;

      expect(entries).to.be.an('array');
      expect(entries.length).to.equal(1);
      expect(entries).to.contain('file2.txt');
      done();
    });
  });

  it('should have correct contents for /dir/file2.txt (read as Buffer)', done => {
    const file2TxtPath = nodePath.resolve(__dirname, '../tiny-fs/dir/file2.txt');

    nodeFs.readFile(file2TxtPath, null, (err, nodeData) => {
      if(err) throw err;

      filerFs.readFile('/dir/file.txt', null, (err, filerData) => {
        if(err) throw err;
  
        expect(nodeData).to.equal(filerData);
        done();
      });  
    });
  });

});
