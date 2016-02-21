/**
 tools for an ioBroker Adapter v0.0.0.1

 Copyright (c) 2016 soef <soef@gmx.net>
 All rights reserved.

 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions and the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of sprintf() for JavaScript nor the
 names of its contributors may be used to endorse or promote products
 derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 DISCLAIMED. IN NO EVENT SHALL Alexandru Marasteanu BE LIABLE FOR ANY
 DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


 Changelog:
 2016-01-13 - 0.0.0.3 fixed errors of initial reeaase
 ...

 2016.01.10 - 0.0.0.1 initial release
 */


"use strict";

const g_Role = ['device', 'channel', 'state'];
const g_Type = ['device', 'channel', 'state'];


function errmsg () { console.log("adapter not assigned, use Device.setAdapter(yourAdapter)") };

function pattern2RegEx(pattern) {
    if (pattern != '*') {
        if (pattern[0] == '*' && pattern[pattern.length - 1] != '*') pattern += '$';
        if (pattern[0] != '*' && pattern[pattern.length - 1] == '*') pattern = '^' + pattern;
    }
    pattern = pattern.replace(/\./g, '\\.');
    pattern = pattern.replace(/\*/g, '.*');
    return pattern;
}


const tr = { '\u00e4': 'ae', '\u00fc': 'ue', '\u00f6': 'oe', '\u00c4': 'Ae', '\u00d6': 'Oe', '\u00dc': 'Ue', '\u00df': 'ss' };

function normalizedName(name) {
    return name.replace(/[\u00e4\u00fc\u00f6\u00c4\u00d6\u00dc\u00df]/g, function ($0) {
        return tr[$0]
    })
}


function valtype(val) {
    switch (val) {
        //fastest way for most states
        case 'true': return true;
        case 'false': return false;
        case '0': return 0;
        case '1': return 1;
        case '2': return 2;
        case '3': return 3;
        case '4': return 4;
        case '5': return 5;
        case '6': return 6;
        case '7': return 7;
        case '8': return 8;
        case '9': return 9;
    }
    var number = parseInt(val);
    if (number.toString() === val) return number;
    var float = parseFloat(val);
    if (float.toString() === val) return float;
    return val;
}

function iscb(cb) {
    return typeof cb === 'function';
}

function dcs(deviveName, channelName, stateName) {
    var ret = '';
    for (var i of [deviveName, channelName, stateName]) {
        if (!ret) ret = i;
        else if (i) ret += '.' + i;
    }
    return ret;
}

if (module.parent.exports['adapter']) {
    var adapter = module.parent.exports.adapter;
} else {
    var adapter = {
        setState: errmsg,
        setObject: errmsg,
        setObjectNotExists: errmsg,
        getStates: errmsg
    };
}

var objects = {};


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function setObject(id, obj, options, callback) {
    return adapter.objects.setObject(adapter.namespace + '.' + id, obj, options, callback);
}
function getObject(id, options, callback) {
    return adapter.objects.getObject(adapter.namespace + '.' + id, options, callback);
}
function setState(id, val, ack) {
    ack = ack || true;
    adapter.setState(id, val, ack);
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


const DEVICE = 0;
const CHANNEL = 1;
const STATE = 2;

const typeNames = ['device', 'channel', 'state'];

function CDeviceQueue (options) {
    options = options || {};
    var that = this;
    var newObjects = [];
    var o = [0,0,0];
    var parent = { _id: '' };
    var checkExists = options.checkExists || true;

    this.add = function (_obj) {
        if (checkExists && objects[_obj._id]) {
            return;
        }
        var obj = Object.assign({}, _obj);
        delete obj.parent;
        objects[obj._id] = obj;
        newObjects.push(obj);
    }

    function __id(_id) {
        return (parent && parent['_id']) ? parent._id + '.' + _id : _id;
    }

    function push(what) {
        if (what+1 < o.length) {
            push(what+1);
        }
        if (o[what]) {
            if (what) {
                //o[what].parent.children.push(o[what]._id);
            }
            that.add(o[what]);
            o[what] = 0;
        }
    }

    function _new (_id, name, what) {
        push(what);
        parent = o[what-1];
        if (what === undefined) {
            what = name;
            name = null;
        }
        o[what] = {
            _id: __id(_id),
            type: typeNames [what],
            common: {
                name: name ? name : _id,
            },
            native: {},
            //children: [],
            parent: parent
        };
        parent = o[what];
        return o[what];
    };

    this.newDevice = function (_id, name) {
        return _new(_id, name, DEVICE);
    };

    this.newChannel = function (_id, name) {
        return _new(_id, name, CHANNEL);
    };

    this.newState = function (name) {
        push(STATE);
        o[STATE] = {
            _id: __id(name),
            type: 'state',
            common: {
                name: name,
                role: 'state',
                read: true,
                write: false
            },
            native: {},
            parent: parent,
        };
        return o[STATE];
    };

    this.update = function () {
        push(DEVICE);

        function addObjects() {
            if (newObjects.length > 0) {
                var newObject = newObjects.pop();
                var val = undefined;
                if (newObject['val']) {
                    val = newObject.val;
                    delete newObject.val;
                }
                //adapter.setObject(newObject._id, newObject, {}, function (err, res) {
                setObject(newObject._id, newObject, {}, function (err, res) {
                    adapter.log.info('object ' + adapter.namespace + '.' + newObject._id + ' created');
                    if (val !== undefined) {
                        adapter.setState(obj._id, val, true);
                    }
                    addObjects();
                });
            }
        }
        addObjects();
    }
    this.ready = this.update;
    return this;
}


////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function Devices (_adapter, _callback) {

    var that = this;
    this.states = objects;

    this.setAdapter = function (_adapter) {
        adapter = _adapter;
    };
    this.has = function (id, prop) {
        var b = this.states.hasOwnProperty(id);
        if (prop === undefined) return b;
        return (b && this.states[id] !== null && this.states[id].hasOwnProperty(prop));
    };
    this.existState = function (id) {
        return (this.has(id, 'exist') && this.states[id].exist === true);
    };
    this.setExist = function (id, val) {
        val = val || true;
        if (!this.has(id)) this.states[id] = { exist: val }
        else this.states[id].exist = val;
    };
    this.setraw = function (id, obj) {
        this.states[id] = obj;
    };
    this.showName = function (id, name) {
        return ((this.states[id] && this.states[id].showName) ? this.states[id].showName : name);
    };

    this.getKeys = function (pattern) {
        var r = new RegExp(pattern2RegEx(pattern));
        var result = [];
        for (var id in this.states) {
            if (r.test(id)) result.push(id);
        }
        return result;
    };

    this.foreach = function (pattern, callback) {
        var r = new RegExp(pattern2RegEx(pattern));
        for (var id in this.states) {
            if (r.test(id)) {
                if (callback (id, this.states[id]) === false) {
                    return { id: id, val: this.states[id]};
                }
            }
        }
    };

    this.stateChanged = function (id, val, ack) {
    };

    this.createObjectNotExists = function (fullName, name, roleNo, callback) {
        var newobj = {
            type: g_Type[roleNo],
            common: {
                name: name,
                role: g_Role[roleNo],
                type: 'string'
            },
            native: {}
        };
        if (this.has(fullName)) {
            var o = this.states[fullName];
            if (o['common']) {      // komplett eigenes Object
                newobj = Object.assign({}, o);
                delete newobj.val;  // val Property entfernen
            } else {
                if (o['type']) newobj.type = o.type;
                if (o['val']) {
                    newobj.common.type = typeof o.val;
                    newobj.common.role = 'state';
                    newobj.type = 'state';
                }
            }
            if (o['showName']) {
                newobj.common.name = o.showName;
            }
        }
        newobj = this.extendObject(fullName, newobj);
        //adapter.getObject(fullName, {}, function (err, obj) {
        getObject(fullName, {}, function (err, obj) {
            if (!obj) {
                setObject(fullName, newobj, callback);
                return;
            }
            if (callback) callback(0, obj);
        })
    };

    this._create = function (id, callback) {
        var as = id.split('.');
        var cnt = 0, fullName = as[0];

        function doIt() {
            while (that.existState(fullName) && ++cnt < as.length) {
                fullName += '.' + as[cnt];
            }
            if (cnt < as.length) {
                that.setExist(fullName);
                that.createObjectNotExists(fullName, as[cnt], cnt, function (err, obj) {
                    //that.setExist(fullName);
                    if (++cnt == as.length && that.has(fullName, 'val')) {
                        that.setState(fullName);
                    }
                    //setTimeout(doIt, 0);
                    doIt();
                });
            } else {
                if (callback) callback(0);
            }
        }
        doIt();
    };

    this.setState = function (id, val, ack) {
        if (val !== undefined) this.states[id].val = val
        else val = this.states[id].val;
        ack = ack || true;
        //adapter.setState(id, val, ack);
        setState(id, val, ack);
        this.stateChanged(id, val, ack);
    };

    this.setStateEx = function (id, newObj, ack, callback) {
        if (typeof ack === 'function') {
            callback = ack;
            ack = true
        }
        if (typeof newObj !== 'object') {
            newObj = { val: newObj };
        }
        if (ack === undefined) ack = true;
        if (!that.has(id)) {
            that.states[id] = newObj;
            that._create(id, callback);
        } else {
            if (that.states[id].val !== newObj.val) {
                that.setState(id, newObj.val, ack);
            }
            if (callback) callback(0);
        }
    };

    this.extendObject = function (fullName, obj) {
        return obj;
    };

    //this.createAll = function (callback) {
    //    var states = [];
    //    for (var i in this.states) {
    //        if (!this.existState(i)) states.push(i);
    //    }
    //    function add() {
    //        if (states.length > 0) {
    //            var i = states.shift();
    //            that.create(i, function (err) {
    //                setTimeout(add, 0);
    //            });
    //        } else {
    //            if (callback) callback(0);
    //        }
    //    }
    //    add();
    //};

    this.update = function (list, callback) {
        if (!list) return callback(-1);
        if (Array.isArray(list)) {
            for (var i=0; i<list.length; i++) {
                var objName = Object.keys( list[i] )[ 0 ];
                this.setStateEx(objName, list[i][objName]);
            }
        } else {
            for (var id in list) {
                this.setStateEx(id, list[id]);
            }
        }
        if (callback) callback(0);
    };

    this.updateSync = function (list, callback) {
        if (!list) return;
        if (list instanceof Array) {
            return callback(-1);
        }
        var states = [];
        for (var i in list) {
            if (!that.existState(i)) states.push(i);
        }
        function setState() {
            if (states.length > 0) {
                var id = states.shift();
                that.setStateEx(id, list[id], true, function (err) {
                    //setTimeout(setState, 0);
                    setState();
                });
                return;
            }
            if (callback) callback(0);
        }
        setState();
    };

    this.readAllExistingObjects = function (callback) {
        //adapter.getStatesOf('', '', {}, function(err, states) {
        adapter.getForeignStates(adapter.namespace + '.*', {}, function(err, states) {
        //adapter.getStates("*", {}, function (err, states) {
            if (err || !states) return callback(-1);
            var namespacelen = adapter.namespace.length + 1;
            for (var fullId in states) {
                var id = fullId.substr(namespacelen),
                    as = id.split('.'),
                    s = as[0];
                for (var i=1; i<as.length; i++) {
                    if (!that.has(s)) that.setraw(s, { exist: true });
                    s += '.' + as[i];
                }
                that.setraw(id, { exist: true, val: states[fullId].val });
            }
            if (callback) callback(0);
        });
    };

    this.CState = function CState (name, showName, list) {

        var channel = "";
        this.list = (list === undefined) ? {} : list;
        this.name = "";

        this.setDevice = function (name, options) {
            //if (name === undefined) return;
            if (!name) return;
            this.name = normalizedName (name);
            this.list [name] = {};
            if (options) for (var i in options) this.list[name][i] = options[i];
            channel = "";
        };
        this.setDevice(name, { showName: showName} );

        this.setChannel = function (name, showName) {
            if (name === undefined) channel = ""
            else {
                channel = '.' + name;
                if (showName) this.list[this.name + channel] = { showName: showName }
            }
        };

        this.add = function (name, valOrObj, showName) {
            if (valOrObj === null) return;
            if (typeof valOrObj === 'object') {
                var obj = valOrObj;
            } else {
                obj = {};
                if (valOrObj !== undefined) obj.val = valtype(valOrObj);
            }
            if (showName) obj.showName = showName;
            //this.list[this.name + channel + (name ? '.' + name : "")] = obj;
            this.list[dcs(this.name, channel, name)] = obj;
        };

        this.set = function (id, newObj, showName) {
            if (!objects[id]) {
                this.add (id, newObj, showName);
                return;
            }
            var val = newObj['val'] ? newObj.val : newObj
            if (objects[id].val !== val) {
                that.setState(id, val, true);
            }
        }


        this.formatValue = function (value, decimals, _format) {
            if (_format === undefined) _format = ".,";
            if (typeof value !== "number") value = parseFloat(value);

            var ret = isNaN(value) ? "" : value.toFixed(decimals || 0).replace(_format[0], _format[1]).replace(/\B(?=(\d{3})+(?!\d))/g, _format[0]);
            return (ret);
        };

        this.update = function () {
            that.update(this.list);
        }

    };

    this.init = function (_adapter, callback) {
        this.setAdapter(_adapter);
        this.readAllExistingObjects(callback);
    };

    if (_adapter) {
        this.init(_adapter, _callback);
    }

    return this;
}

//exports.Devices = Devices;

exports.Devices = Devices;
exports.CDeviceQueue = CDeviceQueue;
