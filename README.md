![Logo](admin/yamaha.png)
## ioBroker.yamaha

Adapter for Yamaha AV receivers

#### Configuration
Currently without autodiscover, you have to enter the IP of your receiver

#### Installation
via ioBroker Admin.

Otherweise execute the following command in the iobroker root directory (e.g. in /opt/iobroker)
``
npm install iobroker.yamaha@pre 
iobroker upload yamaha
``

#### Realtime
The states will be created, when they accur. I.e. use your ir-remote and change something and you will see the new states. 
Only one connection is accepted by yamaha devices.

#### Requirements
Yamaha Reciver

You have to enable "network standby" function in the configuration of your receiver

### License
The MIT License (MIT)

Copyright (c) 2015-2016 soef <soef@gmx.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
