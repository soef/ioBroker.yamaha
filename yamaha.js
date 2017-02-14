"use strict";

var utils = require(__dirname + '/lib/utils');
var soef = require('soef'),
    devices = new soef.Devices(),
    YAMAHA = require("yamaha-nodejs-soef"),
    Y5 = require('y5');

var yamaha,
    peer,
    y5,
    namedInputs = {},
    refreshTimer = soef.Timer();

function clearPeer() {
    if (peer) {
        peer.close();
        peer = null;
    }
}

var adapter = utils.adapter({
    name: 'yamaha',

    unload: function (callback) {
        try {
            if (y5) y5.close();
            refreshTimer.clear();
            clearPeer();
            setTimeout(callback, 1700);
        } catch (e) {
            callback();
        }
    },
    stateChange: function (id, state) {
        devices.setrawval(soef.ns.no(id), state.val);
        if (state && !state.ack) {
            yamaha.execCommand(id, state.val);
        }
    },
    ready: function () {
        devices.init(adapter, function (err) {
            main();
        });
    }
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var zone = 'Main_Zone';

function getZone(zone) {
    if (zone && typeof zone == 'string') return zone;
    return "Main_Zone";
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

if (!YAMAHA.prototype.sendCommand) {
    
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
    
    YAMAHA.prototype.setPureDirect = function (bo) {
        return this.sendCommand('<Sound_Video><Pure_Direct><Mode>' + (bo ? 'On' : 'Off') + '</Mode></Pure_Direct></Sound_Video>');
    };
    YAMAHA.prototype.setHDMIOutput = function (no, bo) {
        return this.sendCommand('<Sound_Video><HDMI><Output><OUT_' + no + '>' + (bo ? 'On' : 'Off') + '</OUT_' + no + '></Output></HDMI></Sound_Video>', 'System');
    };
    YAMAHA.prototype.scene = function (no) {
        adapter.setState('scene', '', true);
        return this.sendCommand('<Scene><Scene_Load>Scene ' + no + '</Scene_Load></Scene>');
    };
    YAMAHA.prototype.power = function (bo, zone) {
        return this.sendCommand('<Power_Control><Power>' + (bo ? 'On' : 'Standby') + '</Power></Power_Control>', zone);
    };
    YAMAHA.prototype.allZones = function (bo) {
        return this.sendCommand('<Power_Control><Power>' + (bo ? 'On' : 'Standby') + '</Power></Power_Control>', 'System');
    };
    
    YAMAHA.prototype.sleep = function (val, zone) {
        if (val < 30) val = 'Off';
        else if (val < 60) val = '30 min';
        else if (val < 90) val = '60 min';
        else if (val < 120) val = '90 min';
        else val = '120 min';
        return this.sendCommand('<Power_Control><Sleep>' + val + '</Sleep></Power_Control>', zone);
    };
    
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

YAMAHA.prototype.setSurround = function (val) {
    return this.sendCommand('<Surround><Program_Sel><Current><Sound_Program>' + val + '</Sound_Program></Current></Program_Sel></Surround>', zone);
};

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
    var obj = devices.get('volume');
    if (obj && obj.val !== 'undefined') {
        obj.val += dif;
        this.setVolumeTo(obj.val);
        adapter.setState("volume", {val: obj.val, ack: true});
    }
};

var commandMappings = {
    volumeUp:           "adjustVolume:val",
    volumeup:           "adjustVolume:val",
    volumeDown:         "adjustVolume:val",
    volumedown:         "adjustVolume:val",
    adjustVolume:       "adjustVolume:val",
    adjustvolume:       "adjustVolume:val",
    volume:             "setVolumeTo:val",
    rccode:             "sendRcCode:val",
    mute:               "setMute:bo",
    surround:           "setSurround:val",
    toggleMute:         "setMute:true",
    togglemute:         "setMute:true",
    // input:              "setMainInputTo:val",
    // inputEnum:          "setMainInputTo:val",
    input:              "input:val",
    inputEnum:          "input:val",
    stop:               "stop:zone",
    pause:              "pause:zone",
    skip:               "skip:zone",
    rewind:             "rewind:zone",
    
    ypaovolume:         "YPAOVolume:bo",
    YPAOVolume:         "YPAOVolume:bo",
    extrabass:          "extraBass:bo",
    extraBass:          "extraBass:bo",
    adaptivedrc:        "adaptiveDRC:bo",
    adaptiveDRC:        "adaptiveDRC:bo",
    allzones:           "allZones:bo",
    allZones:           "allZones:bo",
    
    partymodeon:        "partyModeOn:bo",
    partyModeOn:        "partyModeOn:bo",
    partymodeoff:       "partyModeOff:bo",
    partyModeOff:       "partyModeOff:bo",
    partyMode:          "partyMode:szVal",
    partyModeUp:        "partyModeUp:szVal",
    partyModeDown:      "partyModeDown:szVal",
    setbassto:          "setBassTo:szVal",
    setBassTo:          "setBassTo:szVal",
    settrebleto:        "setTrebleTo:szVal",
    setTrebleTo:        "setTrebleTo:szVal",
    setsubwoofertrimto: "setSubwooferTrimTo:szVal",
    setSubwooferTrimTo: "setSubwooferTrimTo:szVal",
    setdialogliftto:    "setDialogLiftTo:szVal",
    setDialogLiftTo:    "setDialogLiftTo:szVal",
    setDialogLevelTo:   "setDialogLevelTo:szVal",
    scene:              "scene:szVal",
    
    partyModeVolumeUp:  "partyModeUp:val",
    partyModeVolumeDown:"partyModeDown:val",
    bass:               "setBassTo:szVal",
    treble:             "setTrebleTo:szVal",
    subwooferLevel:     "setSubwooferTrimTo:szVal",
    dialogLift:         "setDialogLiftTo:szVal",
    dialogLevel:        "setDialogLevelTo:szVal",
    pureDirect:         "setPureDirect:bo",
    
    zone1:              "power:bo",
    zone2:              "power:bo:Zone_2",
    zone3:              "power:bo:Zone_3",
    zone4:              "power:bo:Zone_4",
    sleep:              "sleep:val:zone",
    soundprogram:       "setSurround:val",
    setSurround:        "setSurround:val",

    hdmiOut1:           "setHDMIOutput:1:bo",
    hdmiOut2:           "setHDMIOutput:2:bo",
    inputto:            "setInputTo:val:zone",
    InputTo:            "setInputTo:val:zone"
};

for (var i in commandMappings) {
    commandMappings[i] = commandMappings[i].split(':');
}


var defaultParams = {
    true: true,
    false: false,
    1: 1,
    2: 2,
    result: function(idx) {
        return this [idx] !== undefined ? this [idx] : idx;
    }
};


YAMAHA.prototype.input = function(val) {
    var v = namedInputs[val];
    if (v !== undefined) val = v;
    this.setMainInputTo(val);
};


YAMAHA.prototype.execCommand = function (id, val) {
    
    if (!adapter._namespaceRegExp.test(id)) return;
    var ar = id.split('.');
    
    var p = Object.assign ({}, defaultParams, {
        bo: (val === 'true') || !!(val >> 0),
        val: val,
        szVal: val.toString(),
        zone: zone
    });
    adapter.log.debug('execCommand: id=' + id + ' val=' + val);
    var commandName = ar[2];
    
    switch(commandName) {
        case 'Commands':
            commandName = ar[3];
            break;
        case 'Realtime':
            if (!y5) return;
            var cmd;
            switch (ar[3]) {
                case 'online': return;
                case 'reconnect': soef.safeFunction(y5, "reconnect") (); return;
                case 'raw': cmd = p.szVal; break;
                default: cmd = soef.sprintf('@%s:%s=%s', ar[3], ar[4], p.szVal);
            }
            y5.send(cmd);
            return;
    }
    
    switch (commandName) {
        case 'input':
        case 'inputEnum':
             break;
        case "power":
            p.bo ? this.powerOn() : this.allZones(false);
            break;
        case "refresh":
            if (p.bo) refreshStates();
            break;
        case "command":
            var a = p.val.split(' ');
            this.execCommand(adapter.namespace + "." + "commands" + "." + a[0], a.length > 1 ? a[1] : false);
            break;
        case "xmlCommand":
            val = val.replace(/\[/g, "<").replace(/\]/g, ">");
            var command = '<YAMAHA_AV cmd="PUT">' + val + '</YAMAHA_AV>';
            return this.SendXMLToReceiver(command);
        case "zone":
            zone = val;
            break;
        case "webradio":
            //this.switchToFavoriteNumber(2);
            //this.switchToWebRadioWithName(val);
            //this.setInputTo(zone, to);
            break;

        default:
            var cmd = commandMappings[commandName];
            if (cmd === undefined) return;
            if (cmd.length === 2) this [cmd[0]] (p.result(cmd[1]) );
            else this [cmd[0]] (p.result(cmd[1]), p.result(cmd[2]) );
    }
};


// YAMAHA.prototype.execCommand = function (id, val) {
//
//     var aS = id.split('.');
//     id = id.toLowerCase();
//     var bo = (val === 'true') || !!(val>>0);
//     var as = id.split('.');
//     if (!adapter._namespaceRegExp.test(id)) return;
//     adapter.log.debug('execCommand: id=' + id + ' val=' + val);
//     var i = 2;
//     var szVal = val.toString();
//
//     var p = {
//         szVal: val.toString(),
//         val: val,
//         bo: bo
//     };
//
//     switch(as[2]) {
//         case 'commands':
//             i = 3;
//             break;
//         case 'realtime':
//             if (!y5) return;
//             var cmd;
//             switch (as[3]) {
//                 case 'online': return;
//                 case 'reconnect': soef.safeFunction(y5, "reconnect") (); return;
//                 case 'raw': cmd = szVal; break;
//                 default: cmd = soef.sprintf('@%s:%s=%s', aS[3], aS[4], szVal);
//             }
//             y5.send(cmd);
//             return;
//     }
//     switch (as [i]) {
//         case "volumeup":
//             this.adjustVolume(val);
//             break;
//         case "volumedown":
//             this.adjustVolume(-val);
//             break;
//         case "adjustvolume":
//             this.adjustVolume(val);
//             break;
//         case "volume":
//             this.setVolumeTo(val);
//             break;
//         case "power":
//             //bo ? this.powerOn() : this.powerOff();
//             bo ? this.powerOn() : this.allZones(false);
//             break;
//         case "refresh":
//             if (bo) refreshStates();
//             break;
//         case "rccode":
//             this.sendRcCode(val);
//             break;
//         case "mute":
//             this.setMute(bo);
//             break;
//         // param = val
//         case "surround":
//             //this.setSurround(val);
//             var fnName = as [i];
//             fnName = 'set' + fnName.substr(0,1).toUpperCase() + fnName.substr(1);
//             this[fnName] (val);
//             break;
//
//         case "togglemute":
//             //this.setMute(!!val);
//             this.setMute(true);
//             break;
//         case "command":
//             var ar = val.split(' ');
//             this.execCommand(adapter.namespace + "." + "commands" + "." + ar[0], ar.length > 1 ? ar[1] : false);
//             break;
//         case "xmlcommand":
//             val = val.replace(/\[/g, "<").replace(/\]/g, ">");
//             var command = '<YAMAHA_AV cmd="PUT">' + val + '</YAMAHA_AV>';
//             return this.SendXMLToReceiver(command);
//         case "input":
//             this.setMainInputTo(val);
//             break;
//
//         case "stop":
//         case "pause":
//         case "skip":
//         case "rewind":
//             this[aS [i]](zone);
//             break;
//
//         case "partymodeon":
//         case "partymodeoff":
//         case "ypaovolume":
//         case "extrabass":
//         case "adaptivedrc":
//         case "allzones":
//             this[aS [i]](bo);
//             break;
//
//         case "partymode":
//         /**/
//         case "partymodeup":
//         case "partymodedown":
//         /**/
//         case "setbassto":
//         case "settrebleto":
//         case "setsubwoofertrimto":
//         case "setdialogliftto":
//         case "setdialoglevelto":
//         case "scene":
//             this[aS [i]](szVal);
//             break;
//
//         case "hdmiout1":
//             this.setHDMIOutput(1, bo);
//             break;
//         case "hdmiout2":
//             this.setHDMIOutput(2, bo);
//             break;
//         case "partymodevolumeup":
//             this.partyModeUp(val);
//             break;
//         case "partymodedown": //??
//             this.partyModeDown(val);
//             break;
//         case "bass":
//             this.setBassTo(szVal);
//             break;
//         case "treble":
//             this.setTrebleTo(szVal);
//             break;
//         case "subwooferlevel":
//             this.setSubwooferTrimTo(szVal);
//             break;
//         case "dialoglift":
//             this.setDialogLiftTo(szVal);
//             break;
//         case "dialoglevel":
//             this.setDialogLevelTo(szVal);
//             break;
//
//         case "inputto":
//             this.setInputTo(val, zone);
//             break;
//         case "soundprogram":
//         case "sleep":
//             this[aS [i]](val, zone);
//             break;
//
//         case "zone1":
//             this.power(bo);
//             break;
//         case "zone2":
//             this.power(bo, 'Zone_2');
//             break;
//         case "zone3":
//             this.power(bo, 'Zone_3');
//             break;
//         case "zone4":
//             this.power(bo, 'Zone_4');
//             break;
//         case "zone":
//             zone = val;
//             break;
//         case "webradio":
//             //this.switchToFavoriteNumber(2);
//             //this.switchToWebRadioWithName(val);
//             //this.setInputTo(zone, to);
//             break;
//     }
// };

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var errorCount = 0;
var timeoutErrorCount = 0;

function onConnectionTimeout() {
    if (peer) return;
    if(y5) y5.close();
    peer = yamaha.waitForNotify(adapter.config.ip, function (headers) {
        peer = null;
        updateStates();
        if (y5) y5.start();
    });
    return true;
}

function callWithCatch(origPromise, onSucess, onError){
    return origPromise.then(function (result) {
        if (errorCount) {
            clearPeer();
            errorCount = 0;
            timeoutErrorCount = 0;
        }
        onSucess(result);
    }).catch(function(error) {
        if (error.code === 'ETIMEDOUT' && timeoutErrorCount++ === 0) {
            onConnectionTimeout();
        }
        if (errorCount++ === 0) {
            adapter.log.error('Can not connect to yamaha receiver at ' + adapter.config.ip + ' ' + error.message);
        }
        safeCallback(onError);
    });
}


function refreshStates(cb) {
    var r = callWithCatch(yamaha.getBasicInfo(), function (basicStatus) {
        if (basicStatus) {
            var zone = 'Main_Zone';
            var dev = devices.root; //new devices.CDevice('');
            dev.setChannel();
            try {
                var curInput = basicStatus.getCurrentInput();
                dev.set("input",      curInput);
                dev.set("inputEnum",  curInput);
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
    }, function() { // on error
        if(typeof devices.get === 'function' && devices.get('power').val) {
            var dev = devices.root;
            dev.setChannel();
            dev.set('power', false);
            dev.set('zone1', false);
            dev.set('zone2', false);
            dev.set('zone3', false);
            dev.set('zone4', false);
            dev.update();
        }
        cb && cb();
    });
}

function updateStates() {
    refreshTimer.clear();
    refreshStates(function() {
        if (adapter.config.intervall) {
            refreshTimer.set(updateStates, adapter.config.intervall * 1000);
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
    if (adapter.config.IP === undefined && adapter.config.Intervall === undefined) {
        return;
    }
    soef.changeConfig(function (config) {
        var changed = false;
        if (config.Intervall != undefined) {
            delete config.Intervall;
            if (!config.intervall) {
                config.intervall = 120;
            }
            changed = true;
        }
        if (config.IP !== undefined) {
            if (!config.ip) config.ip = config.IP;
            delete config.IP;
            changed = true;
        }
        adapter.config = config;
        return changed;
    });
}


function checkIP(callback) {
    if (adapter.config.ip) {
        callback();
        return;
    }
    yamaha.discover(function(ip, info) {
        if (!ip) return;
        soef.changeConfig(function(config) {
                config.ip = ip;
                yamaha.ip = ip;
                adapter.config.ip = ip; // --> soef
            },
            callback
        );
    });
}

function handleRealtimeEvent(event) {
    switch (event) {
        case '@ZONE2:PWR=On': devices.root.setAndUpdate('zone2', true); return;
        case '@ZONE3:PWR=On': devices.root.setAndUpdate('zone3', true); return;
        case '@ZONE4:PWR=On': devices.root.setAndUpdate('zone4', true); return;
        case '@ZONE2:PWR=Standby': devices.root.setAndUpdate('zone2', false); return;
        case '@ZONE3:PWR=Standby': devices.root.setAndUpdate('zone3', false); return;
        case '@ZONE4:PWR=Standby': devices.root.setAndUpdate('zone4', false); return;
    }
    if (adapter.config.refreshOnRealtime) return;
    switch (event) {
        case '@ZONE1:PWR=On': devices.root.setAndUpdate('zone1', true); break;
        case '@ZONE1:PWR=Standby': devices.root.setAndUpdate('zone1', false); break;
        case '@MAIN:PWR=On': devices.root.setAndUpdate('power', true); break;
        case '@MAIN:PWR=Standby': devices.root.setAndUpdate('power', false); break;
    }
}

function runRealtimeFunction() {
    if(!adapter.config.useRealtime) return;
    var updateTimer = soef.Timer();
    var dev = new devices.CDevice('Realtime', 'Realtime');
    dev.set('online', false);
    dev.set('reconnect', false);
    dev.update();
    //dev.setAndUpdate('online', false);
    y5 = Y5(adapter.config.ip, function (err) {
        //dev.setChannel();
        //dev.setAndUpdate('online', { val: err ? false : true, common: { write: false }});
        //dev.setAndUpdate('online', err ? false : true);
        devices.root.setAndUpdate('Realtime.online', err ? false : true);
    });
    y5.start = runRealtimeFunction;
    y5.onTimeout = onConnectionTimeout;
    y5.onData = function(data) {
        data = data.toString().replace(/\r\n$/, '');
        adapter.log.debug('Rawdata: ' + data);
        var ar = data.split('\r\n');
        ar.forEach(function (v) {
            dev.setChannel();
            dev.set('raw', v);
            handleRealtimeEvent(v);
            var a = /@(.*):(.*)=(.*)/.exec(v);
            if (a && a.length > 3) {
                dev.setChannelEx(a[1]);
                dev.set(a[2], a[3]);
            }
        });
        dev.update();
        if (adapter.config.refreshOnRealtime) {
            updateTimer.set(refreshStates, 1000);
        }
    };
}
    
function normalizeConfig() {
    adapter.config.useRealtime = adapter.config.useRealtime || true;
    adapter.config.intervall = adapter.config.intervall >> 0;
}


function checkCase() {
    
    for (var n in commandMappings) {
        var ar = commandMappings[n].split(':');
        if (!yamaha[ar[0]])  {
            console.log(ar[0]);
        }
    }
    
    adapter.ioPack.instanceObjects.forEach(function (v) {
        var ar = v._id.split('.');
        if (ar[0] === 'Commands' || ar.length === 1) {
            var n = ar[ar.length - 1];
            if (n !== n.toLowerCase()) {
                var a = commandMappings[n];
                var b = commandMappings[n.toLowerCase()];
                if ((!a || b) && a !== b) console.log('ioPack._id=' + v._id + ' - commandMappings.lowercase: ' + b);
            }
        }
    });
}


function setPossibleStates(id, objarr, options, cb) {
    if (options === undefined) options = {};
    if (typeof options === 'function') {
        cb = options;
        options = {};
    }
    adapter.getObject(id, function(err, obj) {
        if (err || !obj) return;
        if (objarr.remove || options.remove) {
            if (obj.common.states === undefined) return cb && cb('does not exist');
            delete obj.common.states;
        } else {
            if (!options.force && obj.common.states) return cb && cb('already set');
            obj.common.states = {};
            if (Array.isArray(objarr)) {
                objarr.forEach(function (v) {
                    obj.common.states[v] = v;
                });
            } else {
                obj.common.states = objarr;
            }
        }
        if (options.removeNativeValues && obj.native) delete obj.native.values;
        adapter.setObject(id, obj, function(err, _obj) {
            cb && cb(err, obj);
        });
    })
}

function loadDesc() {
    var url = 'http://' + adapter.config.ip + '/YamahaRemoteControl/desc.xml';
    soef.getHttpData(url, {xml2json2: true }, function(err, data) {
        if (err || !data) return;
        var soundPrograms = [];
        var reSoundProgram = /.*(\">Hall in Munich.*?)<\/Param_1>.*/;
        //var reg = new RegExp(/\">([^>]*)<\/Direct>/g);
        var reLoop = /\">([^>]*)<\/Direct>/g;
        
        var ar = reSoundProgram.exec(data);
        if (!ar || ar.length < 2) return;
        var name;
        while ((name = reLoop.exec(ar[1])) !== null) {
            soundPrograms.push(name[1]);
        }
        setPossibleStates('surround', soundPrograms, {force:1} );
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function prepareAvailableInputs (inputObjs, features) {
    
    namedInputs = {};
    var inputs = [];
    for (var i in inputObjs) {
        var v = inputObjs[i][0];
        i = i.replace(/_/g, '');
        if (i === 'VAUX') i = 'V-AUX';
        inputs.push(i);
        namedInputs[v] = i;
    }
    inputs = inputs.concat (["AirPlay", "NET_RADIO", "Napster", "Spotify"]);
    setPossibleStates("inputEnum", inputs);
    //setPossibleStates("input", {}, { remove:1} );
    //setPossibleStates("input", { remove:1} );
}


function main() {
    normalizeConfig();
    repairConfig();
    yamaha = new YAMAHA(adapter.config.ip, undefined, 15000);
    yamaha.dontCatchRequestErrors = true;
  
    // checkCase();
    // return;
  
    checkIP(function() {
        setTimeout(updateStates, 1000);
        runRealtimeFunction();

        adapter.subscribeStates('*');
    
        loadDesc();

        //yamaha.getWebRadioList().done(function (v) {
        //    console.log(JSON.stringify(v));
        //});
        // yamaha.getList("NET_RADIO").done(function (v) {
        //     console.log(JSON.stringify(v));
        // });

        // callWithCatch(yamaha.getAvailableInputs(), function (inputs) {
        //     adapter.log.debug("getAvailableInputs: " + JSON.stringify(inputs));
        //     inputs = inputs.concat (["AirPlay", "NET_RADIO", "Napster", "Spotify"]);
        //     setPossibleStates("input", inputs);
        // });

        callWithCatch(yamaha.getSystemConfig(), function (v) {
            //adapter.log.debug("getSystemConfig: " + JSON.stringify(v));
            var dev, features, inputObjs, config = soef.getProp(v, "YAMAHA_AV.System.0.Config.0");
            if (!config) return;
            
            if (features = soef.getProp(config, "Feature_Existence.0")) for (var i in features) {
                features[i] = !!(features[i][0] >> 0);
            }
            if (inputObjs = soef.getProp(config, "Name.0.Input.0")) {
                prepareAvailableInputs(inputObjs, features);
            }
            
            dev = new devices.CDevice('SystemConfig');
            dev.set("name", config.Model_Name[0]);
            dev.set("version", config.Version[0]);
            var ft = [];
            for (var i in features) {
                if (features[i]) ft.push(i);
            }
            dev.set("features", ft.toString());
            dev.update();
        });
    });
}

