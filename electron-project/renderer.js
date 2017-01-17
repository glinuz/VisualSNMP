
var snmp = require("net-snmp");
var async = require("async");
var htmlencode = require('htmlencode');
var path = require('path');
var execFile = require('child_process').execFile;

var doWalk = function (host, community, oid) {
    var session = snmp.createSession(host, community);

    if (!oid || oid.length == 0) {
        oid = "1.3.6.1.2.1";
    }
    function doneCb(error) {
        if (error) {
            console.error(error.toString());
            $("#cmdoutput").append('<div class="notification is-danger">' +
                htmlencode.htmlEncode(error.toString()) + '</div>');
            //
        } else {
            $("#cmdoutput").append("<p>Done.</p>");
        }
        $("#lSnmpwalk").removeClass("is-loading");
    }

    if (!host || host.length == 0) {
        doneCb("Please enter SNMP agent IP address.");
        return;
    }

    if (!community || community.length == 0) {
        doneCb("Please enter community string.");
        return;
    }

    function feedCb(varbinds) {


        async.eachSeries(varbinds, (item, cb) => {
            //for (var i = 0; i < varbinds.length; i++) {
            if (snmp.isVarbindError(item)) {
                console.error(snmp.varbindError(item));
                $("#cmdoutput").append('<div class="notification is-warning">' +
                    htmlencode.htmlEncode(snmp.varbindError(item)) + '</div>');
                cb();
            } else {
                var oid = item.oid;
                var val = item.value;
                var filename = 'snmptranslate';
                    if ( process.platform == 'win32' ) {
                        filename = path.join(__dirname, 'bin/snmptranslate.exe');
                        //console.log("snmptranslate: "+filename);
                        //filename = './bin/snmptranslate.exe';
                    }
                var child = execFile(filename, [oid], (error, stdout, stderr) => {
                    var line;
                    if (error) {
                        line = oid + " = " + val;
                    } else {
                        line = stdout.trim() + " = " + snmp.ObjectType[item.type] + ": " + val;
                    }
                    $("#cmdoutput").append("<p>" + htmlencode.htmlEncode(line) + "</p>");
                    cb();
                });

            }
        });
    }

    var maxRepetitions = 20;
    session.walk(oid, maxRepetitions, feedCb, doneCb);
}

var doGet = function (host, community, oid) {
    function doneCb(error) {
        if (error) {
            console.error(error.toString());
            $("#cmdoutput").append('<div class="notification is-danger">' +
                htmlencode.htmlEncode(error.toString()) + '</div>');
            //
        } else {
            $("#cmdoutput").append("<p>Done.</p>");
        }
        $("#lSnmpwalk").removeClass("is-loading");
    }
    if (!host || host.length == 0) {
        doneCb("Please enter SNMP agent IP address.");
        return;
    }

    if (!community || community.length == 0) {
        doneCb("Please enter community string.");
        return;
    }
    if (!oid || oid.length == 0) {
        doneCb("Please enter OID.");
        return;
    }
    var oids = oid.split(",");
    var session = snmp.createSession(host, community);
    
    session.get(oids, function (error, varbinds) {
        if (error) {
            doneCb(error);
            return;
        } else {
            async.eachSeries(varbinds, (item, cb) => {
                //for (var i = 0; i < varbinds.length; i++) {
                if (snmp.isVarbindError(item)) {
                    console.error(snmp.varbindError(item));
                    $("#cmdoutput").append('<div class="notification is-warning">' +
                        htmlencode.htmlEncode(snmp.varbindError(item)) + '</div>');
                    cb();
                } else {
                    var oid = item.oid;
                    var val = item.value;
                    var filename = 'snmptranslate';
                    if ( process.platform == 'win32' ) {
                        filename = path.join(__dirname, 'bin/snmptranslate.exe');
                    }
                    var child = execFile(filename, [oid], (error, stdout, stderr) => {
                        var line;
                        if (error) {
                            line = oid + " = " + val;
                        } else {
                            line = stdout.trim() + " = " + snmp.ObjectType[item.type] + ": " + val;
                        }
                        $("#cmdoutput").append("<p>" + htmlencode.htmlEncode(line) + "</p>");
                        cb();
                    });

                }
            }, () => {
                doneCb();
            });
        }
    });
    

    
}

$(function () {
    console.log("process.platform: "+process.platform);
    $("#selectMethod").change(function () {
        //alert("Handler for .change() called: "+this.value);
        if (this.value == "SNMPGET") {
            $("#oid").attr("placeholder", "OID (required)"); 
        } else {
            $("#oid").attr("placeholder", "Root OID (optional)"); 
        }
    });
    $("#lSnmpwalk").click(function () {
        //alert("selectMethod: "+$( "#selectMethod" ).val());
        //alert("SNMPWALK"); 208.74.76.232
        $("#cmdoutput").show();
        var selectMethod = $( "#selectMethod" ).val();
        if (selectMethod == "SNMPWALK") {
            $("#cmdoutput").html("<p>Running SNMPWALK....</p>")
            $("#lSnmpwalk").addClass("is-loading");
            doWalk($("#host").val().trim(), $("#community").val().trim(), $("#oid").val().trim());
        } else if (selectMethod == "SNMPGET") {
            $("#cmdoutput").html("<p>Running SNMPGET....</p>")
            $("#lSnmpwalk").addClass("is-loading");
            doGet($("#host").val().trim(), $("#community").val().trim(), $("#oid").val().trim());
        }
    });
});
