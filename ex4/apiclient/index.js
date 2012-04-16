
var CNBC = require('../lib/CNBC'),
    UPDATEINTERVAL = 5000;



exports.test = function() {
        console.log('Det funkar!');
};


exports.getStockQuotes = function() {
    return updater.getFromCache().mainIndeces;
};

exports.getFtseGainers = function() {
    return updater.getFromCache().ftseGainers;
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
        dataCache.ftseGainers = data;
        countCallbacks();
    };

    function fireCalls() {
        cbCount = 0;
        startTime = new Date().getTime();
        getMainIndeces(receiveMainIndeces);
        getGainerLoser('ftse', 'gainer', receiveFtseGainers);
    };

    fireCalls();

    return {
        getFromCache: function() {
            return dataCache;
        }
    }

}();

