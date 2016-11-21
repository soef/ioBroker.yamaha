"use strict";

var utils = require(__dirname + '/lib/utils');
//var soef = require(__dirname + '/lib/soef'),
var soef = require('soef'),
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
        devices.init(adapter, function (err) {
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

var zone = 'Main_Zone';

function getZone(zone) {
    if (zone && typeof zone == 'string') return zone;
    return "Main_Zone";
}

YAMAHA.prototype.sendCommand = function (command, zone) {
    zone = getZone(zone);
    var command = '<YAMAHA_AV cmd="PUT"><' + zone + '>' + command + '</' + zone + '></YAMAHA_AV>';
    return this.SendXMLToReceiver(command);
};

YAMAHA.prototype.setMute = function (to) {
    return this.sendCommand('<Volume><Mute>' + (to ? "On" : "Off") + '</Mute></Volume>');
};

YAMAHA.prototype.sendRcCode = function (code) {   // 7C80 = Power on/off
    if (typeof code == 'number') {
        code = code.toString(16);
    }
    //DSZ-Z7: <System><Remote_Signal><Receive><Code>***</Code></Receive></Remote_Signal></System>
    //RX-Vx7x: <System><Misc><Remote_Signal><Receive><Code>***</Code></Receive></Remote_Signal></Misc></System>
    //var command = '<YAMAHA_AV cmd="PUT"><Main_Zone><Remote_Control><RC_Code>' + code + '</RC_Code></Remote_Control></Main_Zone></YAMAHA_AV>';
    //var command = '<YAMAHA_AV cmd="PUT"><System><Misc><Remote_Signal><Receive><Code>' + code + '</Code></Receive></Remote_Signal></Misc></System></YAMAHA_AV>';
    //var command = '<YAMAHA_AV cmd="PUT"><System><Remote_Signal><Receive><Code>' + code + '</Code></Receive></Remote_Signal></System></YAMAHA_AV>';

    var command = '<YAMAHA_AV cmd="PUT"><System><Remote_Control><RC_Code>' + code + '</RC_Code></Remote_Control></System></YAMAHA_AV>';
    return this.SendXMLToReceiver(command);
};

YAMAHA.prototype.setPureDirect = function(bo){
    return this.sendCommand('<Sound_Video><Pure_Direct><Mode>' + (bo ? 'On' : 'Off') + '</Mode></Pure_Direct></Sound_Video>');
};
YAMAHA.prototype.setHDMIOutput = function(no, bo){
    return this.sendCommand('<Sound_Video><HDMI><Output><OUT_' + no + '>' + (bo ? 'On' : 'Off') + '</OUT_' + no + '></Output></HDMI></Sound_Video>', 'System');
};
YAMAHA.prototype.scene = function(no) {
    adapter.setState('scene', '', true);
    return this.sendCommand('<Scene><Scene_Load>Scene ' + no + '</Scene_Load></Scene>');
};
YAMAHA.prototype.power = function(bo, zone){
    return this.sendCommand('<Power_Control><Power>' + (bo ? 'On' : 'Standby') + '</Power></Power_Control>', zone);
};
YAMAHA.prototype.allZones = function(bo){
    return this.sendCommand('<Power_Control><Power>' + (bo ? 'On' : 'Standby') + '</Power></Power_Control>', 'System');
};

YAMAHA.prototype.sleep = function(val, zone){
    if (val < 30) val = 'Off';
    else if (val < 60) val = '30 min';
    else if (val < 90) val = '60 min';
    else if (val < 120) val = '90 min';
    else val = '120 min';
    return this.sendCommand('<Power_Control><Sleep>' + val + '</Sleep></Power_Control>', zone);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// remove, if available in NPM Package

if (!YAMAHA.hasOwnProperty("setBassTo")) {

    YAMAHA.prototype.setBassTo = function (to) {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Tone><Bass><Val>' + to + '</Val><Exp>1</Exp><Unit>dB</Unit></Bass></Tone></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.setTrebleTo = function (to) {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Tone><Treble><Val>' + to + '</Val><Exp>1</Exp><Unit>dB</Unit></Treble></Tone></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.setSubwooferTrimTo = function (to) {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Volume><Subwoofer_Trim><Val>' + to + '</Val><Exp>1</Exp><Unit>dB</Unit></Subwoofer_Trim></Volume></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.setDialogLiftTo = function (to) {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Dialogue_Adjust><Dialogue_Lift>' + to + '</Dialogue_Lift></Dialogue_Adjust></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.setDialogLevelTo = function (to) {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Dialogue_Adjust><Dialogue_Lvl>' + to + '</Dialogue_Lvl></Dialogue_Adjust></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.YPAOVolumeOn = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><YPAO_Volume>Auto</YPAO_Volume></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.YPAOVolumeOff = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><YPAO_Volume>Off</YPAO_Volume></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.extraBassOn = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Extra_Bass>Auto</Extra_Bass></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.extraBassOff = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Extra_Bass>Off</Extra_Bass></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.adaptiveDRCOn = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Adaptive_DRC>Auto</Adaptive_DRC></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

    YAMAHA.prototype.adaptiveDRCOff = function () {
        var zone = getZone(); //only available in Main Zone
        var command = '<YAMAHA_AV cmd="PUT"><' + zone + '><Sound_Video><Adaptive_DRC>Off</Adaptive_DRC></Sound_Video></' + zone + '></YAMAHA_AV>';
        return this.SendXMLToReceiver(command);
    };

}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

YAMAHA.prototype.YPAOVolume = function(bo){
    bo ? this.YPAOVolumeOn() : this.YPAOVolumeOff();
};
YAMAHA.prototype.extraBass = function(bo){
    bo ? this.extraBassOn() : this.extraBassOff();
};
YAMAHA.prototype.adaptiveDRC = function(bo){
    bo ? this.adaptiveDRCOn() : this.adaptiveDRCOff();
};
YAMAHA.prototype.partyMode = function(bo){
    bo ? this.partyModeOn() : this.partyModeOff();
};

YAMAHA.prototype.adjustVolume = function (dif) {
    var self = this;
    var akt = adapter.getState("volume", function (err, obj) {
        var val = obj.val + dif;
        self.setVolumeTo(val);
        adapter.setState("volume", { val: val, ack: true });
    });
};


YAMAHA.prototype.execCommand = function (id, val) {

    var iD = id;
    id = id.toLowerCase();
    var bo = val || false;
    if (val === undefined) {
        var as = id.split(" ");
        val = as[1];
        id = as[0];
        bo = val === "true";
    }
    var as = id.split('.');
    var aS = iD.split('.');
    if (as[0] + '.' + as[1] != adapter.namespace) return;
    
    var i = as[2] === "commands" ? 3 : 2;
    var szVal = val;
    if (typeof szVal == 'number') szVal = szVal.toString();

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
            //bo ? this.powerOn() : this.powerOff();
            bo ? this.powerOn() : this.allZones(false);
            break;
        case "refresh":
            if (bo) refreshStates();
            break;
        case "rccode":
            this.sendRcCode(val);
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

        case "stop":
        case "pause":
        case "skip":
        case "rewind":
            this[aS [i]](zone);
            break;

        case "partymodeon":
        case "partymodeoff":
        case "ypaovolume":
        case "extrabass":
        case "adaptivedrc":
        case "allzones":
            this[aS [i]](bo);
            break;

        case "partymode":
        case "partymodeup":
        case "partymodedown":
        case "setbassto":
        case "settrebleto":
        case "setsubwoofertrimto":
        case "setdialogliftto":
        case "setdialoglevelto":
        case "scene":
            this[aS [i]](szVal);
            break;

        case "hdmiout1":
            this.setHDMIOutput(1, bo);
            break;
        case "hdmiout2":
            this.setHDMIOutput(2, bo);
            break;
        case "partymodevolumeup":
            this.partyModeUp(val);
            break;
        case "partymodedown":
            this.partyModeDown(val);
            break;
        case "bass":
            this.setBassTo(szVal);
            break;
        case "treble":
            this.setTrebleTo(szVal);
            break;
        case "subwooferlevel":
            this.setSubwooferTrimTo(szVal);
            break;
        case "dialoglift":
            this.setDialogLiftTo(szVal);
            break;
        case "dialoglevel":
            this.setDialogLevelTo(szVal);
            break;

        case "inputto":
        case "soundprogram":
        case "sleep":
            this[aS [i]](val, zone);
            break;

        case "zone1":
            this.power(bo);
            break;
        case "zone2":
            this.power(bo, 'Zone_2');
            break;
        case "zone3":
            this.power(bo, 'Zone_3');
            break;
        case "zone4":
            this.power(bo, 'Zone_4');
            break;
        case "zone":
            zone = val;
            break;
        case "webradio":
            //this.switchToFavoriteNumber(2);
            //this.switchToWebRadioWithName(val);
            //this.setInputTo(zone, to);
            break;
    }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var errorCount = 0;

function callWithCatch(origPromise, onSucess, onError){
    return origPromise.then(function (result) {
        errorCount = 0;
        onSucess(result);
    }).catch(function(error) {
        if (errorCount++ === 0) {
            adapter.log.error('Can not connect to yamaha receiver at ' + adapter.config.ip + ': ' + error.message);
        }
        safeCallback(onError);
    });
}

function refreshStates(cb) {
    callWithCatch(yamaha.getBasicInfo(), function (basicStatus) {
        if (basicStatus) {
            var zone = 'Main_Zone';
            var dev = devices.root; //new devices.CDevice('');
            dev.setChannel();
            try {
                dev.set("input",      basicStatus.getCurrentInput());
                dev.set("volume",     basicStatus.getVolume());
                dev.set("mute",       basicStatus.isMuted());
                dev.set("power",      basicStatus.isOn());
                dev.set("zone1",      basicStatus.isOn());
                try {
                    dev.set("pureDirect", basicStatus.isPureDirectEnabled());
                } catch (e) {

                }
                var _basicStatus = basicStatus.YAMAHA_AV.Main_Zone[0].Basic_Status[0];
                dev.set('surround', _basicStatus.Surround[0].Program_Sel[0].Current[0].Sound_Program[0]);
                if (_basicStatus.Power_Control && _basicStatus.Power_Control[0] && _basicStatus.Power_Control[0].Sleep) {
                    var v = _basicStatus.Power_Control[0].Sleep[0];
                    dev.set('sleep', (v === 'Off' ? 0 : v));
                }
                if (_basicStatus.Party_Info) dev.set('partyMode', _basicStatus.Party_Info[0] === "On");
                if (_basicStatus.Volume && _basicStatus.Volume[0].Subwoofer_Trim) dev.set('subwooferLevel', parseInt(_basicStatus.Volume[0].Subwoofer_Trim[0].Val[0]));
                if (_basicStatus.Sound_Video && _basicStatus.Sound_Video[0]) {
                    var soundVideo = _basicStatus.Sound_Video[0];
                    if (soundVideo.Tone) dev.set('bass',   parseInt(soundVideo.Tone[0].Bass[0].Val[0]));
                    if (soundVideo.Tone) dev.set('treble', parseInt(soundVideo.Tone[0].Treble[0].Val[0]));
                    if (soundVideo.Dialogue_Adjust) dev.set('dialogLift',  parseInt(soundVideo.Dialogue_Adjust[0].Dialogue_Lift[0]));
                    if (soundVideo.Dialogue_Adjust) dev.set('dialogLevel', parseInt(soundVideo.Dialogue_Adjust[0].Dialogue_Lvl[0]));
                    if (soundVideo.YPAO_Volume) dev.set('YPAOVolume', soundVideo.YPAO_Volume[0] !== 'Off');
                    if (soundVideo.Extra_Bass) dev.set('extraBass', soundVideo.Extra_Bass[0] !== 'Off');
                    if (soundVideo.SoundAdaptive_DRC_Video) dev.set('adaptiveDRC', soundVideo.Adaptive_DRC[0] !== 'Off');
                    if (soundVideo.HDMI && soundVideo.HDMI[0] && soundVideo.HDMI[0].Output) {
                        if (soundVideo.HDMI[0].Output[0].OUT_1) dev.set('hdmiOut1', soundVideo.HDMI[0].Output[0].OUT_1[0] === 'On');
                        if (soundVideo.HDMI[0].Output[0].OUT_2) dev.set('hdmiOut2', soundVideo.HDMI[0].Output[0].OUT_2[0] === 'On');
                    }
                }
            } catch (e) {
                //console.log(e);
            }
            dev.update();
        }
        safeCallback(cb);
    }, function() {
        if(typeof devices.get === 'function' && devices.get('power').val) {
            var dev = devices.root;
            dev.setChannel();
            dev.set('power', false);
            dev.set('zone1', false);
            dev.update();
        }
        cb();
    });
}


function updateStates() {
    refreshStates(function() {
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
                adapter.setObject(obj._id, obj, {val: obj.common.def}, function (err, o) {
                    if (obj.common.hasOwnProperty('def')) adapter.setState(obj._id, obj.common.def, true);
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

    var ip = '';
    var ips = [];

    function saveFoundIP(ip, callback) {
        adapter.getForeignObject("system.adapter." + adapter.namespace, function (err, obj) {
            obj.native.ip = ip;
            adapter.setForeignObject(obj._id, obj, {}, function (err, obj) {
                adapter.config.ip = ip;
                callback();
            });
        });
    }

    function getIPAddresses() {
        // found on stackoverflow
        var interfaces = require('os').networkInterfaces();
        for (var devName in interfaces) {
            var iface = interfaces[devName];

            for (var i = 0; i < iface.length; i++) {
                var alias = iface[i];
                if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal)
                    ips.push(alias.address);
                //return alias.address;
            }
        }
        //return '0.0.0.0';
    }

    adapter.log.info('No IP configurated, trying to find a device...');
    getIPAddresses();
    if (ips.length <= 0) {
        return;
    }

    function check() {
        var ownip = ips.pop();
        var prefixIP = ownip.split('.', 3).join('.') + '.';
        var request = require('request');
        var i = 1;

        adapter.log.info('Own IP: ' + ownip + ' Range: ' + prefixIP + '1...255');

        function doRequest() {
            if (!ip && i < 255) {
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
                        i++;
                        setTimeout(doRequest, 0);
                    }
                );
            } else {
                if (ips.length && !ip) setTimeout(check, 0);
            }
        }

        doRequest();
    }
    check();
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

        callWithCatch(yamaha.getAvailableInputs(), function (v) {
            adapter.log.debug("getAvailableInputs: " + JSON.stringify(v));
            var inputs = v;
            adapter.getObject("input", function (err, obj) {
                if (err || !obj) return;
                obj.native.values = inputs + [, "AirPlay", "NET_RADIO", "Napster", "Spotify"];
                adapter.setObject("input", obj);
            })
        });

        callWithCatch(yamaha.getSystemConfig(), function (v) {
            adapter.log.debug("getSystemConfig: " + JSON.stringify(v));
            var dev = new devices.CDevice('SystemConfig');
            dev.set("name", v.YAMAHA_AV.System[0].Config[0].Model_Name[0]);
            dev.set("version", v.YAMAHA_AV.System[0].Config[0].Version[0]);
            dev.update();
        });
    });
}
