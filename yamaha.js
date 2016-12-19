"use strict";

var utils = require(__dirname + '/lib/utils');
var soef = require('soef'),
    devices = new soef.Devices(),
    //YAMAHA = require("yamaha-nodejs"),
    YAMAHA = require("yamaha-nodejs-soef"),
    Y5 = require('y5');

var yamaha,
    peer,
    y5,
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
        if (state && !state.ack) {
            yamaha.execCommand(id, state.val);
        }
    },
    ready: function () {
        devices.init(adapter, function (err) {
            main();
        });
    },
    // objectChange: function (id, obj) {
    //     //adapter.log.info('objectChange ' + id + ' ' + JSON.stringify(obj));
    // }
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


YAMAHA.prototype.execCommand = function (id, val) {

    var aS = id.split('.');
    id = id.toLowerCase();
    var bo = (val === 'true') || !!(val>>0);
    var as = id.split('.');
    if (!adapter._namespaceRegExp.test(id)) return;
    adapter.log.debug('execCommand: id=' + id + ' val=' + val);
    var i = 2;
    var szVal = val.toString();
    switch(as[2]) {
        case 'commands':
            i = 3;
            break;
        case 'realtime':
            if (!y5) return;
            var cmd;
            switch (as[3]) {
                case 'online': return;
                case 'raw': cmd = szVal; break;
                default: cmd = soef.sprintf('@%s:%s=%s', aS[3], aS[4], szVal);
            }
            y5.send(cmd);
            return;
    }
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
            //this.setMute(!!val);
            this.setMute(true);
            break;
        case "command":
            var ar = val.split(' ');
            this.execCommand(adapter.namespace + "." + "commands" + "." + ar[0], ar.length > 1 ? ar[1] : false);
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
        /**/
        case "partymodeup":
        case "partymodedown":
        /**/
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
        case "partymodedown": //??
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

// function refreshStates(cb) {
//     callWithCatch(yamaha.getBasicInfo(), function (basicStatus) {
//         if (basicStatus) {
//             var zone = 'Main_Zone';
//             var dev = devices.root; //new devices.CDevice('');
//             dev.setChannel();
//             dev.set("input", basicStatus.getCurrentInput());
//             dev.set("volume", basicStatus.getVolume());
//             dev.set("mute", basicStatus.isMuted());
//             dev.set("power", basicStatus.isOn());
//             dev.set("zone1", basicStatus.isOn());
//             dev.set("pureDirect", basicStatus.isPureDirectEnabled());
//             dev.set("surround", basicStatus.YAMAHA_AV.Main_Zone[0].Basic_Status[0].Surround[0].Program_Sel[0].Current[0].Sound_Program[0]);
//             var v = basicStatus.YAMAHA_AV.Main_Zone[0].Basic_Status[0].Power_Control[0].Sleep[0];
//             dev.set('sleep', (v === 'Off' ? 0 : v));
//             dev.set("partyMode", basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Party_Info[0] === "On");
//
//             try {
//                 dev.set('bass', parseInt(basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Tone[0].Bass[0].Val[0]));
//                 dev.set('treble', parseInt(basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Tone[0].Treble[0].Val[0]));
//                 dev.set('subwooferLevel', parseInt(basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Volume[0].Subwoofer_Trim[0].Val[0]));
//                 dev.set('dialogLift', parseInt(basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Dialogue_Adjust[0].Dialogue_Lift[0]));
//                 dev.set('dialogLevel', parseInt(basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Dialogue_Adjust[0].Dialogue_Lvl[0]));
//                 dev.set('YPAOVolume', basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].YPAO_Volume[0] !== 'Off');
//                 dev.set('extraBass', basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Extra_Bass[0] !== 'Off');
//                 dev.set('adaptiveDRC', basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].Adaptive_DRC[0] !== 'Off');
//
//                 dev.set('hdmiOut1', basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].HDMI[0].Output[0].OUT_1[0] === 'On');
//                 dev.set('hdmiOut2', basicStatus.YAMAHA_AV[zone][0].Basic_Status[0].Sound_Video[0].HDMI[0].Output[0].OUT_2[0] === 'On');
//
//             } catch (e) {
//                 //console.log(e);
//             }
//             dev.update();
//         }
//         safeCallback(cb);
//     }, function() {
//         if(typeof devices.get == 'function' && devices.get('power').val) {
//             var dev = devices.root;
//             dev.setChannel();
//             dev.set("power", false);
//             dev.set("zone1", false);
//             dev.update();
//         }
//         cb();
//     });
// }


function refreshStates(cb) {
    var r = callWithCatch(yamaha.getBasicInfo(), function (basicStatus) {
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
    }, function() { // on error
        if(typeof devices.get === 'function' && devices.get('power').val) {
            var dev = devices.root;
            dev.setChannel();
            dev.set('power', false);
            dev.set('zone1', false);
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


function runRealtimeFunction() {
    if(!adapter.config.useRealtime) return;
    var dev = new devices.CDevice('Realtime', 'Realtime');
    dev.setAndUpdate('online', false);
    y5 = Y5(adapter.config.ip, function (err) {
        dev.setChannel();
        //dev.setAndUpdate('online', { val: err ? false : true, common: { write: false }});
        dev.setAndUpdate('online', err ? false : true);
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
            var a = /@(.*):(.*)=(.*)/.exec(v);
            if (a && a.length > 3) {
                dev.setChannelEx(a[1]);
                dev.set(a[2], a[3]);
            }
        });
        dev.update();
        if (adapter.config.refreshOnRealtime) {
            refreshStates();
        }
    };
}
    
function normalizeConfig() {
    adapter.config.useRealtime = adapter.config.useRealtime || true;
    adapter.config.intervall = adapter.config.intervall >> 0;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function main() {
    
    normalizeConfig();
    repairConfig();
    yamaha = new YAMAHA(adapter.config.ip, undefined, 15000);
    yamaha.dontCatchRequestErrors = true;
    checkIP(function() {
        setTimeout(updateStates, 1000);
        runRealtimeFunction();

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
