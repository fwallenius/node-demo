

// This is NOT a global function, it's only visible within this file
var examineRequest = function (req) {
	
	return {
		method: 	req.method,	
		url: 		req.url,
		headers: 	req.headers
	};
};


// Expose the function 'examineRequest', but named 'doExamination'
exports.doExamination = examineRequest;

