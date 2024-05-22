import chai from 'chai';

import  '../experimentsTest';

const { expect } = chai;

describe('information', () => {
    beforeEach(function () {
        Meteor.users.remove({});
        ExperimentsTest.remove({});
    });
    describe('change experiment info', function () {
        //create a new experiement
        it('change experiment name successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"name", value:"new_test_experiement"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].name).to.equal("new_test_experiement");
        });
        it('change experiment adminName successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"adminName", value:"new_adminName"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].adminName).to.equal("new_adminName");
        });
        it('change experiment contactInfo successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"contactInfo", value:"new_contactInfo"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].contactInfo).to.equal("new_contactInfo");
        });
        it('change experiment description successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"description", value:"new_description"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].description).to.equal("new_description");
        });
        it('change experiment urlPP successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"urlPP", value:"new_urlPP"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].urlPP).to.equal("new_urlPP");
        });
        it('change experiment urlTC successfully', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"urlTC", value:"new_urlTC"},
                );
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].urlTC).to.equal("new_urlTC");
        });

        it('change experiment name fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const name = resultStatus.fetch()[0].name;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"name", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].name).to.equal(name);
        });
        it('change experiment adminName fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const adminName = resultStatus.fetch()[0].adminName;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"adminName", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].adminName).to.equal(adminName);
        });
        it('change experiment contactInfo fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const contactInfo = resultStatus.fetch()[0].contactInfo;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"contactInfo", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].contactInfo).to.equal(contactInfo);
        });
        it('change experiment description fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const description = resultStatus.fetch()[0].description;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"description", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].description).to.equal(description);
        });
        it('change experiment urlPP fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const urlPP = resultStatus.fetch()[0].urlPP;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"urlPP", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].urlPP).to.equal(urlPP);
        });
        it('change experiment urlTC fail', function () {
            Meteor.call('experiments.create.test',"test_experiement");
            const resultStatus = ExperimentsTest.find();
            const experiement_id = resultStatus.fetch()[0]._id;
            const urlTC = resultStatus.fetch()[0].urlTC;
            try{
                Meteor.call('experiments.updateInformation.test',
                experiement_id,
                {key:"urlTC", value:123},
                );
            } catch (error) {
                expect(error.errorType).to.equal('Match.Error');
            }
            const result = ExperimentsTest.find({_id:experiement_id}).fetch();
            expect(result[0].urlTC).to.equal(urlTC);
        });
    });


});


