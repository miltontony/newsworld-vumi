var vumigo = require("vumigo_v01");
var jed = require("jed");

if (typeof api === "undefined") {
    // testing hook (supplies api when it is not passed in by the real sandbox)
    var api = this.api = new vumigo.dummy_api.DummyApi();
}

var Promise = vumigo.promise.Promise;
var success = vumigo.promise.success;
var Choice = vumigo.states.Choice;
var ChoiceState = vumigo.states.ChoiceState;
var FreeText = vumigo.states.FreeText;
var EndState = vumigo.states.EndState;
var InteractionMachine = vumigo.state_machine.InteractionMachine;
var StateCreator = vumigo.state_machine.StateCreator;

function NewsWorldError(msg) {
    var self = this;
    self.msg = msg;

    self.toString = function() {
        return "<NewsWorldError: " + self.msg + ">";
    };
}

function NewsWorldApi(im) {
    var self = this;

    self.im = im;

    self.headlines_get = function(region) {
        var p = new Promise();
        var url = region == 'Local' ? "http://newsworld.co.za/api/news/headlines/" : "http://newsworld.co.za/api/inews/headlines/";
        self.im.api.request("http.get", {
                url: url,
                headers: self.headers
            },
            function(reply) {
                var json = self.check_reply(reply, url, 'GET', false);
                p.callback(json);
            });
        return p;
    };

    self.check_reply = function(reply, url, method, data, ignore_error) {
        var error;
        if (reply.success && reply.code == 200) {
            var json = JSON.parse(reply.body);
            return json;
        }
        else {
            error = reply.reason;
        }
        var error_msg = ("API " + method + " to " + url + " failed: " +
                         error);
        if (typeof data != 'undefined') {
            error_msg = error_msg + '; data: ' + JSON.stringify(data);
        }
        self.im.log(error_msg);
        if (!ignore_error) {
            throw new NewsWorldError(error_msg);
        }
    };

    self.format_title = function(str){
        return str.length < 25 ? str : str.substr(0, 23) + '..'
    };

    self.get_article = function(news, hash_key){
        for (var i in news){
            if (news[i].hash_key == hash_key){
                return news[i]
            }
        }
        return false
    };
}

function NewsWorld() {
    var self = this;
    // The first state to enter
    StateCreator.call(self, 'welcome_state');

    self.add_creator('welcome_state', function(state_name, im) {
        return new ChoiceState(
            state_name,
            function(choice) {
                return 'news_index_state';
            },
            "Welcome to NewsWorld!",
            [
                new Choice("Local", "Local News"),
                new Choice("World", "World News")
            ]
            );
    });

    self.add_creator('news_index_state', function(state_name, im) {
        var newsworld_api = new NewsWorldApi(im);
        var chosen_region = im.get_user_answer('welcome_state');
        var p = newsworld_api.headlines_get(chosen_region);
        p.add_callback(function(response) {
            var choices = response.articles.map(function(m) {
                return new Choice(m.hash_key, newsworld_api.format_title(m.title));
            });
            choices[choices.length] = new Choice("back", "Back");
            return new ChoiceState(
                state_name,
                function(choice) {
                    return (choice.value == "back" ?
                            "welcome_state" :
                            "news_detail_state");
                },
                chosen_region + " News", choices);
        });
        return p;
    });

    self.add_creator('news_detail_state', function(state_name, im) {
        var newsworld_api = new NewsWorldApi(im);
        var chosen_region = im.get_user_answer('welcome_state');
        var chosen_item = im.get_user_answer('news_index_state');
        var p = newsworld_api.headlines_get(chosen_region);
        p.add_callback(function(response) {
            article = newsworld_api.get_article(response.articles, chosen_item)
            var response_body = article.title+": "+article.content
            return new ChoiceState(
                state_name,
                function(choice) {
                    return (choice.value == 'more' ? 'news_more_state' : 'end_state');
                },
                response_body.length < 140 ? response_body : response_body.substr(0, 138) + "..",
                [
                    new Choice("more", "Read more?"),
                    new Choice("quit", "Quit")
                ]
                );
        });
        return p;
    });

    self.add_state(new EndState(
        "news_more_state",
        "Thank you! An sms will be sent to you!",
        "welcome_state"
    ));

    self.add_state(new EndState(
        "end_state",
        "Thank you and bye bye!",
        "welcome_state"
    ));
}

// launch app
var states = new NewsWorld();
var im = new InteractionMachine(api, states);
im.attach();
