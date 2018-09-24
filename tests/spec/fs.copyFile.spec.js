var util = require('../lib/test-utils.js');
var expect = require('chai').expect;

describe('fs.copyFile', function() {
    beforeEach(util.setup);
    afterEach(util.cleanup);

    it('should be a function', function() {
        var fs = util.fs();
        expect(fs.copyFile).to.be.a('function');
    })

    it('shoud return an error if the source file does not exist', function(done) {
        var fs = util.fs();

        fs.copyFile('source.txt', 'destination.txt', function(eror){
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');
            done();
        })
    })

    it('adding the flag as an argument, should ruturn an error if the destination file already exist', function (done){
        var fs = util.fs();
        
        fs.copyFile('source.txt', 'destination.txt', COPYFILE_EXCL, function(error){
            expect(error).to.exist;
            expect(error.code).to.equal('ENOENT');
            done();
        });
    })
});
