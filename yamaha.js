"use strict";

var utils = require(__dirname + '/lib/utils');
var soef = require(__dirname + '/lib/soef'),
    devices = new soef.Devices();

var YAMAHA = require("yamaha-nodejs");
var yamaha;

var adapter = utils.adapter({
    name: 'yamaha',

    unload: function (callback) {
        try {
            callback();
        } catch (e) {
            callback();
        }
    },
    install: function (callback) {
        log("adapter.on(install)");
        //
        //adapter.getStatesOf(function (err, objs) {
        //    if (objs) {
        //        for (var i = 0; i < objs.length; i++) {
        //            log(objs[i]._id);
        //            adapter.setState(objs[i]._id, { val: "", ack: false });
        //        }
        //    }
        //});
    },
    stateChange: function (id, state) {
        if (state && !state.ack) {
            yamaha.execCommand(id, state.val);
        }
    },
    ready: function () {
        devices.init(adapter, function(err) {

            /*
            var dev = new devices.CDevice('Device1', "Device No 1");
            dev.set('device1-state-bool1', true);
            dev.set('device1-state-string', "string");
            dev.set('device1-state-number', 123);
            dev.setChannel('channel1', "def erste Kanal");
            dev.set('device1-channel1-state-bool1', true);
            dev.set('device1-channel1-state-string', "string");
            dev.set('device1-channel1-state-number', 123);
            dev.setChannel('');
            dev.set('state-string', "root string");
            dev.setDevice('device2');
            dev.set('device2-state-bool', true);
            dev.set('.root', 'root');
            dev.update();
            return;
             */

            main();
        });
    },
    discover: function (callback) {
    },
    uninstall: function (callback) {
    },
    objectChange: function (id, obj) {
        //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    }
});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

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

function updateStates() {
    yamaha.getBasicInfo().done(function (v) {
        var dev = devices.root; //new devices.CDevice('');
        dev.setChannel();
        dev.set("input", v.getCurrentInput());
        dev.set("volume", v.getVolume());
        dev.set("mute", v.isMuted());
        dev.set("power", v.isOn());
        dev.set("surround", v.YAMAHA_AV.Main_Zone[0].Basic_Status[0].Surround[0].Program_Sel[0].Current[0].Sound_Program[0]);
        dev.update();

        var intervall = adapter.config.intervall >> 0;
        if (intervall) {
            setTimeout(updateStates, intervall * 1000);
        }
    });
}

function repairObjects(callback) {
    var reread = false;
    forEachObjSync(adapter.ioPack.instanceObjects,
        function(obj, doit) {
            adapter.getObject(obj._id, {}, function(err,o) {
                if (o) {
                    doit(0);
                    return;
                }
                adapter.setObject(obj._id, obj, {}, function (err, o) {
                    reread = true;
                    doit(0);
                });
            });
        },
        function (err) {
            if (reread) {
                devices.readAllExistingObjects();
            }
            safeCallback(callback, 0);
        }
    )
}


function repairConfig () {
    repairObjects();
    if (!adapter.config['IP'] && !adapter.config['Intervall']) {
        return;
    }
    adapter.getForeignObject("system.adapter." + adapter.namespace, function (err, obj) {
        var changed = false;
        if (obj.native['Intervall']) {
            delete obj.native.Intervall;
            if (!obj.native['intervall']) {
                obj.native.intervall = 120;
            }
            changed = true;
        }
        if (obj.native['IP']) {
            obj.native.ip = obj.native.IP;
            delete obj.native.IP;
            changed = true;
        }
        if (changed) {
            //delete obj.native.Password;
            //delete obj.native.pollingInterval;
            //delete obj.native.User;
            adapter.setForeignObject(obj._id, obj, {}, function (err, obj) {
            });
        }
    });
}

function discoverReceiver(callback) {

    function saveFoundIP(ip, callback) {
        adapter.getForeignObject("system.adapter." + adapter.namespace, function (err, obj) {
            obj.native.ip = ip;
            adapter.setForeignObject(obj._id, obj, {}, function (err, obj) {
                adapter.config.ip = ip;
                callback();
            });
        });
    }

    adapter.log.info('No IP configurated, trying to find a device...');
    require('dns').lookup(require('os').hostname(), function (err, add, fam) {
        if (err || !add) {
            return;
        }
        var ip = '';
        var prefixIP = add.split('.', 3).join('.') + '.';
        //var request = require('./node_modules/yamaha-nodejs/node_modules/request');
        var request = require('request');
        adapter.log.info('Own IP: ' + add + ' Range: ' + prefixIP + '1..255');
        for (var i = 1; i < 255; i++) {
            if (ip) break;
            request.post(
                {
                    timeout: 200,
                    method: 'POST',
                    uri: 'http://' + prefixIP + i + '/YamahaRemoteControl/ctrl',
                    body: '<YAMAHA_AV cmd="GET"><System><Config>GetParam</Config></System></YAMAHA_AV>'
                },
                function (err, response, body) {
                    if (!err && response.statusCode == 200) {
                        ip = response.request.host;
                        var r = body.match("<Model_Name>(.*?)</Model_Name>.*?<System_ID>(.*?)</System_ID>.*?<Version>(.*?)</Version>");
                        r = r || body.match("<Model_Name>(.*?)</Model_Name>");
                        if (r && r.length >= 4) {
                            adapter.log.info('Yamaha Receiver found. IP: ' + ip + ' - Model: ' + r[1] + ' - System-ID: ' + r[2] + ' - Version: ' + r[3]);
                        } else if (r && r.length >= 2) {
                            adapter.log.info('Yamaha Receiver found. IP: ' + ip + ' - Model: ' + r[1]);
                        }
                        saveFoundIP(ip, callback);
                    }
                }
            );
        }
    });
}

function checkIP(callback) {
    if (adapter.config.ip) {
        callback();
        return;
    }
    discoverReceiver(callback);
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function main() {

    repairConfig();
    checkIP(function() {
        yamaha = new YAMAHA(adapter.config.ip);

        setTimeout(updateStates, 1000);

        adapter.subscribeStates('*');

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
                if (err || !obj) return;
                obj.native.values = inputs + [, "AirPlay", "NET_RADIO", "Napster", "Spotify"];
                adapter.setObject("input", obj);
            })
        });

        yamaha.getSystemConfig().done(function (v) {
            adapter.log.debug("getSystemConfig: " + JSON.stringify(v));
            var dev = new devices.CDevice('SystemConfig');
            dev.set("name", v.YAMAHA_AV.System[0].Config[0].Model_Name[0]);
            dev.set("version", v.YAMAHA_AV.System[0].Config[0].Version[0]);
            dev.update();
        });
    });
}
