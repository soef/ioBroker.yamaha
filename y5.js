"use strict";

var net = require('net');

var Y5 = function (ip, cb) {
    if (!(this instanceof Y5)) {
        return new Y5(ip, cb);
    }
    if (typeof ip === 'function') {
        cb = ip;
        ip = undefined;
    }
    var self = this;
    var interval;
    var client;
    
    this.onData = function (data) {
    };
    
    client = new net.Socket();
    // client.setTimeout(3000, function () {
    // });
    
    client.on('data', function (data) {
        self.onData(data);
    });
    
    client.on('error', function (error) {
        //console.log('error: ' + error.errno + ' ' + error.message);
        //cb && cb(-1);
        switch (error.errno) { //error.code
            case 'ECONNRESET':
            case 'ETIMEDOUT':
            case 'EPIPE':
                self.reconnect();
                break;
        }
    });
    client.on('close', function() {
        //console.log('Connection closed');
    });
    client.on('end', function() {
        //console.log('Connection end');
    });
    
    this._close = function () {
        if (interval) {
            clearInterval(interval);
            interval = null;
        }
        if (client) {
            client.destroy();
            //client.end();
        }
    };
    this.close = function () {
        this._close();
        client = null;
    };
    
    this.connect = function(_ip) {
        ip = _ip || ip;
        client.connect(50000, ip, function() {
            //console.log('connected...');
            self.send('@MAIN:PWR=?');
            interval = setInterval(function() {
                self.send('@MAIN:PWR=?');
            }, 30000);
            cb && cb();
        });
    };
    
    this.send = function (s) {
        client.write(s + '\r\n');
    };
    
    this.reconnect = function () {
        console.log('reconnecting...');
        this._close();
        //create();
        this.connect();
    };
    this.end = function() {
        client.end();
    };
    
    if (ip) this.connect(ip);
};

module.exports = Y5;

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function startListener(ip, port, callback) {
    var dgram = require('dgram');
    
    var socket = dgram.createSocket( {type: 'udp4', reuseAddr: true} );
    socket.on('error', function (err) {
        console.log(err.message);
    });
    socket.bind(port, '192.168.1.25', function () {
        //socket.bind(port, function () {
        //socket.setMulticastTTL(128);
        socket.setBroadcast(true);
        socket.addMembership(ip, '192.168.1.25');
        socket.setMulticastLoopback(true);
        
        if (callback) return callback(socket);
    });
    socket.on('message', function(msg, rinfo) {
        //console.log(rinfo.address);
        if (rinfo.address != '192.168.1.20') return;
        msg = msg.toString();
        var ar = msg.split('\r\n');
        //console.log(port + ' ' + msg);
        //console.log(ip + ':' + port + ' - ' + ar[2] + ' ' + ar[0]);
        msg = msg.replace(/\r\n/g, ' - ');
        console.log(ip + ':' + port);
        console.log(msg);
    });
};

// startListener('239.255.255.250', 1900);
// startListener('239.255.255.250', 1902);
// startListener('239.255.255.250', 0);
// startListener('239.255.250.250', 9131);
// startListener('224.0.0.251', 5353);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
