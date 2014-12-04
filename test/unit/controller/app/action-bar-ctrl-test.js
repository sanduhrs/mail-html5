'use strict';

var Email = require('../../../../src/js/email/email'),
    Dialog = require('../../../../src/js/util/dialog'),
    StatusDisplay = require('../../../../src/js/util/status-display'),
    ActionBarCtrl = require('../../../../src/js/controller/app/action-bar');

describe('Action Bar Controller unit test', function() {
    var scope, actionBarCtrl, emailMock, dialogMock, statusDisplayMock;

    beforeEach(function() {
        emailMock = sinon.createStubInstance(Email);
        dialogMock = sinon.createStubInstance(Dialog);
        statusDisplayMock = sinon.createStubInstance(StatusDisplay);

        angular.module('actionbartest', []);
        angular.mock.module('actionbartest');
        angular.mock.inject(function($rootScope, $controller) {
            scope = $rootScope.$new();
            scope.state = {
                mailList: {
                    updateStatus: function() {}
                }
            };

            scope.state.nav = {
                currentFolder: {
                    type: 'Inbox',
                    path: 'INBOX',
                    messages: [{
                        checked: true
                    }, {
                        checked: false
                    }]
                }
            };

            scope.state.read = {
                open: true
            };

            actionBarCtrl = $controller(ActionBarCtrl, {
                $scope: scope,
                email: emailMock,
                dialog: dialogMock,
                statusDisplay: statusDisplayMock
            });
        });
    });

    afterEach(function() {});

    describe('deleteMessage', function() {
        it('should not delete without a selected mail', function() {
            scope.deleteMessage();
        });

        it('should delete the selected mail', function() {
            emailMock.deleteMessage.yields();

            scope.deleteMessage({});

            expect(emailMock.deleteMessage.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
        });
    });

    describe('deleteCheckedMessages', function() {
        var deleteMessageStub;

        beforeEach(function() {
            deleteMessageStub = sinon.stub(scope, 'deleteMessage');
        });
        afterEach(function() {
            deleteMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.deleteCheckedMessages();

            expect(deleteMessageStub.calledOnce).to.be.true;
        });
    });

    describe('moveMessage', function() {
        it('should not move without a selected mail', function() {
            scope.moveMessage();
        });

        it('should move the selected mail', function() {
            emailMock.moveMessage.yields();

            scope.moveMessage({}, {});

            expect(emailMock.moveMessage.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
        });
    });

    describe('moveCheckedMessages', function() {
        var moveMessageStub;

        beforeEach(function() {
            moveMessageStub = sinon.stub(scope, 'moveMessage');
        });
        afterEach(function() {
            moveMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.moveCheckedMessages();

            expect(moveMessageStub.calledOnce).to.be.true;
        });
    });

    describe('getJunkFolder', function() {
        it('should work', function() {
            scope.account = {
                folders: [{
                    type: 'Junk'
                }]
            };
            var folder = scope.getJunkFolder();
            expect(folder).to.exist;
        });

        it('should fail', function() {
            scope.account = {
                folders: [{
                    type: 'NotJunk'
                }]
            };
            var folder = scope.getJunkFolder();
            expect(folder).to.not.exist;
            expect(dialogMock.error.calledOnce).to.be.true;
        });
    });

    describe('markMessage', function() {
        it('should not mark without a selected mail', function() {
            scope.markMessage();
        });

        it('should not mark when old and new changes are equivalent', function() {
            scope.markMessage({
                unread: false
            }, false);

            scope.markMessage({
                unread: true
            }, true);
        });

        it('should mark the selected mail', function() {
            emailMock.setFlags.yields();

            scope.markMessage({}, true);

            expect(emailMock.setFlags.calledOnce).to.be.true;
            expect(scope.state.read.open).to.be.false;
        });
    });

    describe('markCheckedMessages', function() {
        var markMessageStub;

        beforeEach(function() {
            markMessageStub = sinon.stub(scope, 'markMessage');
        });
        afterEach(function() {
            markMessageStub.restore();
        });

        it('should mark the selected mail', function() {
            scope.markCheckedMessages();

            expect(markMessageStub.calledOnce).to.be.true;
        });
    });

    describe('flagMessage', function() {
        it('should not flag without a selected mail', function() {
            scope.flagMessage();
        });

        it('should not flag when old and new changes are equivalent', function() {
            scope.flagMessage({
                flagged: false
            }, false);

            scope.flagMessage({
                flagged: true
            }, true);
        });

        it('should flag the selected mail', function() {
            emailMock.setFlags.yields();

            scope.flagMessage({}, true);

            expect(emailMock.setFlags.calledOnce).to.be.true;
        });
    });

    describe('flagCheckedMessages', function() {
        var flagMessageStub;

        beforeEach(function() {
            flagMessageStub = sinon.stub(scope, 'flagMessage');
        });
        afterEach(function() {
            flagMessageStub.restore();
        });

        it('should delete the selected mail', function() {
            scope.flagCheckedMessages();

            expect(flagMessageStub.calledOnce).to.be.true;
        });
    });

});