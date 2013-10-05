var fs = require("fs");
var assert = require("assert");
var vumigo = require("vumigo_v01");
// CHANGE THIS to your-app-name
var app = require("../lib/newsworld-vumi");

// This just checks that you hooked you InteractionMachine
// up to the api correctly and called im.attach();
describe("test_api", function() {
    it("should exist", function() {
        assert.ok(app.api);
    });
    it("should have an on_inbound_message method", function() {
        assert.ok(app.api.on_inbound_message);
    });
    it("should have an on_inbound_event method", function() {
        assert.ok(app.api.on_inbound_event);
    });
});

// YOUR TESTS START HERE
// CHANGE THIS to test_your_app_name
describe("When using newsworld", function() {

    // These are used to mock API reponses
    // EXAMPLE: Response from google maps API
    var fixtures = [
       'test/fixtures/local_headlines.json',
       'test/fixtures/international_headlines.json',
    ];

    var tester = new vumigo.test_utils.ImTester(app.api, {
        custom_setup: function (api) {
            api.config_store.config = JSON.stringify({
                //user_store: "go_skeleton"
            });
            fixtures.forEach(function (f) {
                api.load_http_fixture(f);
            });
        },
        async: true,
        max_response_length: 160
    });

    // first test should always start 'null, null' because we haven't
    // started interacting yet
    it(", first screen should ask us to choose a stream ", function (done) {
        var p = tester.check_state({
            user: null,
            content: null,
            next_state: "welcome_state",
            response: "^Welcome to NewsWorld![^]"+
                      "1. Local News[^]"+
                      "2. World News$"
        });
        p.then(done, done);
    });

    it(", choosing local should show local news", function (done) {
        var user = {
            current_state: 'welcome_state'
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "news_index_state",
            response: (
                "^Local News[^]" +
                "1. SARS crime bust - 4 arrested[^]"+
                "2. Lungisa's arrest welcomed[^]"+
                "3. Bail for formey NYDA chair[^]"+
                "4. View more[^]"+
                "5. Home$"
            )
        });
        p.then(done, done);
    });

    it(", choosing a local story should show the text", function (done) {
        var user = {
            current_state: 'news_index_state',
            answers: {
                welcome_state: 'Local',
                news_index_state: 'a2406f291ef51a79036548eaaa306f06'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "news_detail_state",
            response: (
                "Lungisa's arrest welcomed: Arts and Culture Minister "+
                "Paul Mashatile welcomed the arrest of former National "+
                "Youth Development Agency \\(NYD..[^]"+
                "1. Read more\\?[^]"+
                "2. Quit$"
            ),
        });
        p.then(done, done);
    });

    it("choosing international should show international news", function (done) {
        var user = {
            current_state: 'welcome_state'
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "news_index_state",
            response: (
                "^World News[^]"+
                "1. Israel PM to Iran: Stop nuclear work[^]"+
                "2. U.S. shuts down; insults shoot up[^]"+
                "3. 'Largest storm that I can imagine' wears on i...[^]"+
                "4. View more[^]"+
                "5. Home$"
            )
        });
        p.then(done, done);
    });

    it("choosing an international story should show the text", function (done) {
        var user = {
            current_state: 'news_index_state',
            answers: {
                welcome_state: 'World',
                news_index_state: '3ed47e2ec2b5e3de5e4a9a5bca579197'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "news_detail_state",
            response: (
                "Israel PM to Iran: Stop nuclear work: Prime Minister of Israel "+
                "Benjamin Netanyahu talks to CNN's Piers Morgan about "+
                "President Hassan Ruh..[^]"+
                "1. Read more\\?[^]"+
                "2. Quit$"
            ),
        });
        p.then(done, done);
    });

    it("choosing read more should send an sms", function (done) {
        var user = {
            current_state: 'news_detail_state',
            answers: {
                welcome_state: 'Local',
                news_index_state: 'a2406f291ef51a79036548eaaa306f06',
                news_detail_state: 'more'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "1",
            next_state: "news_more_state",
            response: ("^Thank you! An sms will be sent to you!$"),
            continue_session: false
        });
        p.then(done, done);
    });

    it("choosing Quit should end session", function (done) {
        var user = {
            current_state: 'news_detail_state',
            answers: {
                welcome_state: 'Local',
                news_index_state: 'a2406f291ef51a79036548eaaa306f06',
                news_detail_state: 'more'
            }
        };
        var p = tester.check_state({
            user: user,
            content: "2",
            next_state: "end_state",
            response: ("^Thank you and bye bye!$"),
            continue_session: false
        });
        p.then(done, done);
    });
});
