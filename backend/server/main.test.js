/* eslint-disable no-undef */
import assert from 'assert';
import chai from 'chai';


describe('your-backend', () => {
    it('package.json has correct name', async () => {
        const { name } = await import('../package.json');
        assert.strictEqual(name, 'your-backend');
        chai.assert.equal(name, 'your-backend');
    });

    if (Meteor.isServer) {
        it('server is not client', () => {
            assert.strictEqual(Meteor.isClient, false);
            chai.assert.equal(Meteor.isClient, false);
        });
    }
});
