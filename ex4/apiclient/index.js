
var CNBC = require('../lib/CNBC'),
    UPDATEINTERVAL = 3000,
    listener = null;





exports.test = function() {

};


exports.getStockQuotes = function() {
    return updater.getFromCache().mainIndeces;
};

exports.getFtseGainers = function() {
    return updater.getFromCache().ftseGainers;
}

exports.onUpdate = function(callback) {
    listener = callback;
}


/* Example, get currencies
CNBC.api.category.get('currencies', function(d) {
    console.log(d);
});
*/

/*getGainerLoser('ftse', 'gainer', function(data) {
    console.log(data);
});
*/


/**
 *  Get the three stock indeces (used in top menu)
 */
function getMainIndeces(callback) {
    CNBC.api.quote.get([".FTSE", ".FCHI", ".GDAXI"], callback);
}

/**
 *  Call with ftse / dax + gainer / loser
 */
function getGainerLoser(symbol, type, callback) {

    CNBC.api.category.get(symbol, function(items) {
        // sort items by change
        var swapped = true;
        while ( swapped ) {
            swapped = false;
            for ( var i = 1; i < items.length; i++ ) {
                
                var prev = parseFloat(items[i-1].change_pct);
                var curr = parseFloat(items[i].change_pct);
                if (
                    (type == 'gainer' && curr > prev) ||
                    (type == 'loser' && curr < prev)
                ) {
                    var temp = items[i-1];
                    items[i-1] = items[i];
                    items[i] = temp;
                    swapped = true;
                }
            }
        }
        
        // add items to list
        var listItems = [];
        for ( var i = 0; i < 20; i++ ) {
            var item = items[i];
            listItems.push(item);
        }

        callback(listItems);

    });

};

// Init periodic update of data from api
var updater = function() {
    var cbCount = 0,
        startTime = null,
        TOTALAMOUNT = 2;

    var dataCache = {};

    function countCallbacks() {
        cbCount += 1;

        if (cbCount === TOTALAMOUNT) {
            // All calls done, set timer for next one
            var now = new Date().getTime(),
                elapsed = now - startTime;
            console.log(TOTALAMOUNT + ' api calls took ' + elapsed + ' to complete');

            var waitTime = (elapsed < UPDATEINTERVAL) ? (UPDATEINTERVAL - elapsed) : 500;
            console.log('Firing new calls in ' + waitTime + ' ms');
            setTimeout(fireCalls, waitTime);
        }
    };

    function receiveMainIndeces(data) {
        dataCache.mainIndeces = data;
        countCallbacks();
    };

    function receiveFtseGainers(data) {
        dataCache.ftseGainers = consolidateData(data);
        if (listener) {
            listener(dataCache.ftseGainers);
        }
        countCallbacks();
    };

    function fireCalls() {
        cbCount = 0;
        startTime = new Date().getTime();
        getMainIndeces(receiveMainIndeces);
        getGainerLoser('dax', 'gainer', receiveFtseGainers);
    };

    fireCalls();

    return {
        getFromCache: function() {
            return dataCache;
        }
    }

}();

var consolidateData = function(data) {
    var smallData = [];

    for (var i = 0; i < data.length; i++) {
        var info = data[i];
        info.last = cutDecimals(info.last, 4).substring(0, 6);

        info.change = cutDecimals(info.change, 2);
        info.change_pct = cutDecimals(info.change_pct, 2);

        // create change string
        var change;

        // decide if change is neutral, positive, or negative
        var className = 'change';
        if ( info.change == 0 ) {
            className += ' neutral';
            change = 'UNCH';
        }
        if ( info.change > 0 ) {
            className += ' positive';
            change = '+' + info.change + ' (+' + info.change_pct + '%)';
        }
        if ( info.change < 0 ) {
            className += ' negative';
            change = info.change + ' (' + info.change_pct + '%)';
        }

        smallData.push({
            label: info.name,
            last: info.last,
            change: info.change,
            change_pct: info.change_pct,
            change_string: change,
            change_className: className
        });
    }

    smallData.sort(function(el1, el2) {
        return el2.change_pct - el1.change_pct;
    });

    return smallData;
}


// trim decimals off of float [value] to [amount] precision
// pads with zeroes if needed
// returns a string
var cutDecimals = function(value, amount) {
    
    // cut to amount of decimals
    var multiple = Math.pow(10, amount);
    var result = Math.round((value*multiple))/multiple;
    
    //// pad with zeroes
    var str = '' + result;
    var pos = str.indexOf('.');
    // if there is no point, add it
    if ( pos == -1 ) {
        str += '.';
        pos = str.indexOf('.');
    }
    
    // length of decimal numbers part (after point)
    var len = str.substring(pos+1).length;
    // create zeroes from len to amount
    str += new Array((amount-len)+1).join('0');
    return str;
};

