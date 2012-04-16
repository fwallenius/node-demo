
var http = require('http'),
    xml2js = require('xml2js');


// Imitation of the ajax function in the original Samsung App:
var App = {};

App.ajax = function (url, type, successFn, errorFn) {

    // console.log('App.ajax: ' + url);
    // console.log('Type: ' + type);
    // console.log('host: ' + url.slice(7, url.indexOf('/', 8)));
    // console.log('path: ' + url.slice(url.indexOf('/', 8)));


    var options = {
        host: url.slice(7, url.indexOf('/', 8)),
        port: 80,
        path: url.slice(url.indexOf('/', 8))
    };
    
    var buffer = '';

    http.get(options, function(res) {
        //        console.log("Got response: " + res.statusCode);
        res.on('data', function (chunk) {
            //            console.log('BODY: ' + chunk);
            buffer += chunk.toString();
        });
        res.on('end', function() {
            if (type === 'json') {
                var resp = JSON.parse(buffer);
                successFn(resp);
            }
            if (type == 'xml') {
                var parser = new xml2js.Parser();
                parser.parseString(buffer, function (err, result) {
                    // console.log(result.stocks.stock);
                    // console.log('Done');
                    successFn(result);
                });
            }
        });
    }).on('error', function(e) {
        console.log("Got error: " + e.message);
    });
    
    
};


CNBC = {
    
    category: {
        baseUrl: 'http://samsung-connectedtv.cnbc.com/',
        backupBaseUrl: 'backupXmls/', // localhost
        
        // .xml-files: cac40 ftse dax currencies commodities
        
        // get quote info for each stock item in an xml file, using backup file if main file fails
        // will modify item name in accordance with the usedisplayname flag in xml file
        get: function(label, callback) {
            
            // get concatenated value of all child nodes
            // necessary because the xml's contain cdata with multiple textNodes because whitespaces
            var getNodeValue = function(node){
                var result = '';
                // loop over all child elements and concatenate values
                var children = node.childNodes;
                for ( var i = 0; i < children.length; i++ ) {
                    result += children[i].nodeValue;
                }
                // trim whitespace
                result = result.replace(/\s*/g, '');
                return result;
            };
            
            var handleResponse = function(doc) {
                
                // memory code regarding first element that contains the category entry,
                // it exists before the stocks entries, but is not used in the app
                //var node = doc.getElementsByTagName('category')[0].getElementsByTagName('displayname')[0];
                //var displayName = getNodeValue(node);
                
                // var xmlItems = doc.getElementsByTagName('stock');
                var xmlItems = doc.stocks.stock;
                
                var symbols = [];
                
                for ( var i = 0; i < xmlItems.length; i++ ) {
                    // symbols.push(getNodeValue(
                    //     xmlItems[i].getElementsByTagName('symbol')[0]
                    //     ));
                    symbols.push(xmlItems[i].symbol);
                }
             
                CNBC.quote.get(symbols, function(items){
                    for ( var i = 0; i < items.length; i++ ) {
                        if ( xmlItems[i]['@'].usedisplayname === 'true' ) {
                            // console.log('Changing ' + items[i].name + ' to ' +xmlItems[i].displayname);
                            items[i].name = xmlItems[i].displayname;
                        }
                    }
                    callback(items);
                });
            };
            
            var self = this;
            
            // try getting data from main xml file
            var url = this.baseUrl + label + '.xml';
            App.ajax(url, 'xml', handleResponse, function(defaultAction) {
             
                // if it failed, try getting data from backup file
                var url = self.backupBaseUrl + label + '.xml';
                App.ajax(url, 'xml', handleResponse, function(defaultAction) {
                    
                    // if that failed as well, perform the default failure handler action
                    defaultAction();
                });
            });
        }
    },
    
    quote: {
        baseUrl: 'http://quote.cnbc.com/quote-html-webservice/quote.htm',
        defaultParams: {
            exthrs: '1',
            extMode: '', // ??
            fund: '1',
            entitlement: '0',
            realtime: '0',
            //extendedMask: '1',
            partnerId: '8003',
            noform: '1',
            skipcache: '0',
            output: 'json'
        },
        
        get: function(symbols, callback) {
            CNBC.quote.makeRequests('quick', '1', symbols, callback);
        },
        
        getExtended: function(symbols, callback) {
            CNBC.quote.makeRequests('extended', '30', symbols, callback);
        },
        
        makeRequests: function(requestMethod, extendedMask, symbols, callback) {
            
            var tmp = 'json';
            if ( typeof spezial != 'undefined' && spezial === true ) {
                tmp = 'xml';
                CNBC.quote.defaultParams['output'] = 'xml';
            }
            
            var params = '?';
            params += 'requestMethod=' + requestMethod + '&';
            for ( var i in CNBC.quote.defaultParams ) {
                params += i + '=' + CNBC.quote.defaultParams[i] + '&';
            }
            
            params += 'extendedMask=' + extendedMask + '&';
            
            var items = [];
            
            var complete = function(){
                var validItems = [];
                for ( var i = 0; i < items.length; i++ ) {
                    for ( var j = 0; j < items[i].length; j++ ) {
                        if ( requestMethod == 'quick' ) {
                            var test = items[i][j].code === '0';
                        }
                        if ( requestMethod == 'extended' ) {
                            var test = items[i][j].QuickQuote.code === '0';
                        }
                        if ( test ) {
                            validItems.push(items[i][j]);
                        }
                    }
                }
                callback(validItems);
            };
            
            var symbolsPerRequest = 15;
            var nrOfRequests = 0;
            var counter = 0;
            var start = 0;
            
            if ( symbols.length == 0 ) {
                complete();
            } else {
                while ( true ) {
                    
                    var partSymbols = symbols.slice(start, start+symbolsPerRequest);
                    if ( partSymbols.length == 0 ) {
                        break;
                    }
                    start += symbolsPerRequest;
                    
                    var currParams = params + 'symbols=';
                    var symbolsParam = '';
                    for ( var i = 0; i < partSymbols.length; i++ ) {
                        symbolsParam += partSymbols[i] + '|';
                    //symbolsParam += encodeURIComponent(partSymbols[i]) + '|';
                    }
                    symbolsParam = symbolsParam.slice(0, symbolsParam.length-1);
                    symbolsParam = encodeURIComponent(symbolsParam);
                    currParams += symbolsParam;
                    
                    nrOfRequests++;
                    
                    
                    App.ajax(this.baseUrl + currParams, tmp, function(data){
                        var myItems;
                        if ( requestMethod == 'quick' ) {
                            myItems = data.QuickQuoteResult.QuickQuote;
                        }
                        if ( requestMethod == 'extended' ) {
                            myItems = data.ExtendedQuoteResult.ExtendedQuote;
                        }
                        
                        var isArray = Object.prototype.toString.call(myItems) === '[object Array]';
                        if ( !isArray ) {
                            myItems = [ myItems ];
                        }
                        items[counter] = myItems;
                        counter++;
                        if ( counter == nrOfRequests ) {
                            complete();
                        }
                    });
                }
            }
        }
    },
    
    search: {
        baseUrl: 'http://symlookup.cnbc.com/symservice/symlookup.do',
        defaultParams: {
            output: 'json'
        //maxresults: '10', // appears to not determine result amount, but rather if countryCode is present or not.....
        },
        
        get: function(prefix, callback) {
            var params = '?';
            var newPrefix = '';
            for ( var i = 0; i < prefix.length; i++ ) {
                if ( prefix[i] == ' ' ) {
                    newPrefix += encodeURIComponent(prefix[i]);
                } else {
                    newPrefix += prefix[i];
                }
            }
            params += 'prefix=' + encodeURIComponent(newPrefix) + '&';
            for ( var i in this.defaultParams ) {
                params += i + '=' + this.defaultParams[i] + '&';
            }
            params = params.slice(0, params.length-1);
            //DOUT('searching: ' + this.baseUrl + params)
            App.ajax(this.baseUrl + params, 'json', function(data){
                callback(data);
            });
        }
    },
    
    video: {
        baseUrl: 'http://plus.cnbc.com/rssvideosearch.do',
        defaultParams: {
            partnerId: '8003',
            output: 'json'
        },
        
        maximumBitrate: 2000000, // about 2 megabits
        
        /*
        getByIds: function(ids, callback) {
            var params = '?';
            for ( var i in this.defaultParams ) {
                params += i + '=' + this.defaultParams[i] + '&';
            }
            
            for ( var i = 0; i < ids.length; i++ ) {
                params += ids[i] + '|';
            }
            currParams = currParams.slice(0, currParams.length-1);
            
            App.ajax(this.baseUrl + params, 'json', function(data){
                var videos = data.rss.channel.item;
                callback(videos);
            });
        },
        */
        
        getByIds: function(ids, callback) {
            CNBC.video.makeRequest(null, ids, callback);
        },
        
        getLatest: function(callback) {
            CNBC.video.makeRequest(10, [], callback);
        },
        
        makeRequest: function(pageSize, ids, callback) {
            
            var params = '?';
            for ( var i in this.defaultParams ) {
                params += i + '=' + this.defaultParams[i] + '&';
            }
            params = params.slice(0, params.length-1);
            
            if ( pageSize !== null ) {
                params += '&pageSize=' + pageSize;
            }
            
            if ( ids.length > 0 ) {
                params += '&action=videos&ids=';
                for ( var i = 0; i < ids.length; i++ ) {
                    params += ids[i] + ',';
                }
                params = params.slice(0, params.length-1);
            }
            
            App.ajax(this.baseUrl + params, 'json', function(data){
                var videos = data.rss.channel.item;
                
                var validVideos = [];
                
                for ( var i = 0; i < videos.length; i++ ) {
                    var video = videos[i];
                    
                    var latestBitrate = 0;
                    var chosenItem = null;
                    
                    var items = video['metadata:formatLink'];
                    for ( var j = 0; j < items.length; j++ ) {
                        var item = items[j];
                        
                        // filter out only strings because there might be an empty object at the end of the array
                        if ( typeof(item) === 'string' ) {
                            
                            // each url is actually embedded in a pipe separated string
                            // examples:
                            // mpeg4_1100000_Download|http://pdl.iphone.cnbc.com/CNBCNews.com/883/106/3ED2-SBE-MarkOSullivan_1Mbps.m4v&reporting=part="SAMSUNG"|parttype=VOD
                            // mpeg4_200000_Download|http://pdl.iphone.cnbc.com/CNBCNews.com/883/106/3ED2-SBE-MarkOSullivan_126K.m4v&reporting=part="SAMSUNG"|parttype=VOD
                            // mpeg4_600000_Download|http://pdl.iphone.cnbc.com/CNBCNews.com/883/106/3ED2-SBE-MarkOSullivan_500K.m4v&reporting=part="SAMSUNG"|parttype=VOD
                            
                            var parts = item.split('|');
                            var typeParts = parts[0].split('_');
                            
                            if ( typeParts[0] == 'mpeg4' ) {
                                var bitrate = parseInt(typeParts[1]);
                                
                                // if this item's bitrate is more suitable than any previosuly found for this video
                                if ( bitrate < CNBC.video.maximumBitrate && bitrate > latestBitrate ) {
                                    // store it and continue
                                    latestBitrate = bitrate;
                                    chosenItem = j;
                                }
                            }
                        }
                    }
                    
                    // if a suitable bitrate was found for this video
                    if ( chosenItem !== null ) {
                        var item = items[chosenItem];
                        var parts = item.split('|');
                        var urlParts = parts[1].split('&'); // use url without params because samsung platform limitation
                        
                        // store the video
                        validVideos.push({
                            id: video['metadata:id'],
                            url: urlParts[0],
                            title: video.title
                        });
                    }
                }
                
                callback(validVideos);
            });
        }
    }
};

exports.api = CNBC;