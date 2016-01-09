"use strict";

var utils = require(__dirname + '/lib/utils');
var adapter = utils.adapter('yamaha');

var YamahaAPI = require("yamaha-nodejs");
var yamaha;

function YAMAHA (ip) {
    this.constructor(ip);
}

YAMAHA.prototype = new YamahaAPI();
YAMAHA.prototype.setMute = function (to) {
    var command = '<YAMAHA_AV cmd="PUT"><Main_Zone><Volume><Mute>' + (to ? "On" : "Off") + '</Mute></Volume></Main_Zone></YAMAHA_AV>';
    return this.SendXMLToReceiver(command);
}

YAMAHA.prototype.adjustVolume = function (dif) {
    var self = this;
    var akt = adapter.getState("volume", function (err, obj) {
        var val = obj.val + dif;
        self.setVolumeTo(val);
        adapter.setState("volume", { val: val, ack: true });
    });
}


YAMAHA.prototype.execCommand = function (id, val) {
    
    id = id.toLowerCase();
    var bo = val || false;
    if (val === undefined) {
        var as = id.split(" ");
        val = as[1];
        id = as[0];
        bo = val === "true";
    }
    var as = id.split('.');
    if (as[0] + '.' + as[1] != adapter.namespace) return;
    
    var i = as[2] === "commands" ? 3 : 2;
    
    switch (as [i]) {
        case "volumeup":
            this.adjustVolume(val);
            break;
        case "volumedown":
            this.adjustVolume(-val);
            break;
        case "adjustvolume":
            this.adjustVolume(val);
            break;
        case "volume":
            this.setVolumeTo(val);
            break;
        case "power":
            bo ? this.powerOn() : this.powerOff();
            break;
        case "mute":
            this.setMute(bo);
            break;
        case "togglemute":
            this.setMute(true);
            break;
        case "command":
            this.execCommand(this.namespace + "." + "commands" + "." + val);
            break;
        case "xmlcommand":
            val = val.replace(/\[/g, "<").replace(/\]/g, ">");
            var command = '<YAMAHA_AV cmd="PUT">' + val + '</YAMAHA_AV>';
            return this.SendXMLToReceiver(command);
        case "input":
            this.setMainInputTo(val);
            break;
        case "webradio":
            //this.switchToFavoriteNumber(2);
            //this.switchToWebRadioWithName(val);
            //this.setInputTo(zone, to);
            break;
    }
}


adapter.on('install', function () {
    log("adapter.on(install)");
    adapter.getStatesOf(function (err, objs) {
        if (objs) {
            for (var i = 0; i < objs.length; i++) {
                log(objs[i]._id);
                adapter.setState(objs[i]._id, { val: "", ack: false });
            }
        }
    });
});


adapter.on('unload', function (callback) {
    try {
        adapter.log.info('cleaned everything up...');
        callback();
    } catch (e) {
        callback();
    }
});


adapter.on('objectChange', function (id, obj) {
    // Warning, obj can be null if it was deleted
    //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
});



adapter.on('stateChange', function (id, state) {
    adapter.log.debug('stateChange ' + id + ' ' + JSON.stringify(state));
    
    if (state && !state.ack) {
        yamaha.execCommand(id, state.val);
    }
});


adapter.on('message', function (obj) {
    if (typeof obj == 'object' && obj.message) {
        if (obj.command == 'send') {
            // e.g. send email or pushover or whatever
            console.log('send command');

            // Send response in callback if required
            if (obj.callback) adapter.sendTo(obj.from, obj.command, 'Message received', obj.callback);
        }
    }
});


adapter.on('ready', function () {
    main();
});


function updateState(name, val) {
    adapter.getState(name, function (err, obj) {
        if (!obj || obj.val !== val)
            adapter.setState(name, { val: val, ack: true });
    });
}


function updateStates() {
    yamaha.getBasicInfo().done(function (v) {
        adapter.log.debug ("getBasicInfo " + JSON.stringify(v));
        updateState("input", v.getCurrentInput());           
        updateState("volume", v.getVolume());
        updateState("mute", v.isMuted());
        updateState("power", v.isOn());
        updateState("surround", v.YAMAHA_AV.Main_Zone[0].Basic_Status[0].Surround[0].Program_Sel[0].Current[0].Sound_Program[0]);


        if (adapter.config.intervall !== undefined && adapter.config.intervall !== 0) {
            setTimeout(updateStates, adapter.config.intervall * 1000);
        }
    });
}


function main() {
    
    yamaha = new YAMAHA(adapter.config.ip);
    
    adapter.getStatesOf(function (err, objs) {
        if (objs) {
            for (var i = 0; i < objs.length; i++) {
                updateState(objs[i]._id, 0);
            }
        }
        updateStates();
        
        adapter.subscribeStates('*');
    });
    

    //yamaha.getWebRadioList().done(function (v) {
    //    console.log(JSON.stringify(v));
    //});
    //yamaha.getList("NET_RADIO").done(function (v) {
    //    console.log(JSON.stringify(v));
    //});
    
    yamaha.getAvailableInputs().done(function (v) {
        adapter.log.debug("getAvailableInputs: " + JSON.stringify(v));
        var inputs = v;
        adapter.getObject("input", function (err, obj) {
            obj.native.values = inputs + [,"AirPlay", "NET_RADIO", "Napster", "Spotify"];
            adapter.setObject("input", obj);
        })
    });
    
    yamaha.getSystemConfig().done(function (v) {
        adapter.log.debug("getSystemConfig: " + JSON.stringify(v));
        updateState("SystemConfig.name", v.YAMAHA_AV.System[0].Config[0].Model_Name[0]);
        updateState("SystemConfig.version", v.YAMAHA_AV.System[0].Config[0].Version[0]);
    });
}