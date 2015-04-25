'use strict';

var urlParser = require('url');
var https = require('https');
var querystring = require('querystring');
var _ = require('underscore');

/**
 * Constructor for PayPal object.
 */
function Paypal(apiUsername, apiPassword, signature, debug) {
	this.username = apiUsername;
	this.password = apiPassword;
	this.signature = signature;
	this.debug = debug || false;
	this.payOptions = {};
	this.products = [];

	this.url = 'https://' + (debug ? 'api-3t.sandbox.paypal.com' : 'api-3t.paypal.com') + '/nvp';
	this.redirect = 'https://' + (debug ? 'www.sandbox.paypal.com/cgi-bin/webscr' : 'www.paypal.com/cgi-bin/webscr');
}

/**
 * Paypal params.
 * @return {object} [description]
 */
Paypal.prototype.params = function() {
	var result = {
		USER: this.username,
		PWD: this.password,
		SIGNATURE: this.signature,
		VERSION: '119.0',
	};

	return result; 
};

/**
 * Format number to be in proper format for payment.
 * @param  {[type]} num        [description]
 * @param  {[type]} doubleZero [description]
 * @return {string}            Returns null if cannot format.
 */
function prepareNumber(num, doubleZero) {
	var str = num.toString().replace(',', '.');

	var index = str.indexOf('.');
	if (index > -1) {
		var len = str.substring(index + 1).length;
		if (len === 1) {
			str += '0';
		}

		if (len > 2) {
			str = str.substring(0, index + 3);
		}
	} else {
		if (doubleZero || true) {
			str += '.00';
		}
	}

	return str;
}


/**
 * GetExpressCheckoutDetails, this will also call DoExpressCheckoutPayment optionally; in most cases you want to have this. 
 * @param  {string}   token    [description]
 * @param  {bool}   doPayment  you want to set this to true in most cases.
 * @param  {Function} callback [description]
 * @return {Paypal}            [description]
 */
Paypal.prototype.getExpressCheckoutDetails = function(token, doPayment, callback) {
	var self = this;
	var params = self.params();

	params.TOKEN = token;
	params.METHOD = 'GetExpressCheckoutDetails';

	self.request(self.url, 'POST', params, function(err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		if (!doPayment) {
			return callback(null, data);
		}

		var params = self.params();
		params.PAYMENTACTION = 'Sale';
		params.PAYERID = data.PAYERID;
		params.TOKEN = token;
		params.PAYMENTREQUEST_0_AMT = data.PAYMENTREQUEST_0_AMT;
		params.PAYMENTREQUEST_0_CURRENCYCODE = data.PAYMENTREQUEST_0_CURRENCYCODE;
		params.PAYMENTREQUEST_0_ITEMAMT = data.PAYMENTREQUEST_0_ITEMAMT;
		params.METHOD = 'DoExpressCheckoutPayment';

		self.request(self.url, 'POST', params, function(err, data2) {
			if (err) {
				callback(err, data2);
				return;
			}

			if (data.ACK  !== 'Success') {
				return callback(new Error('Error DoExpressCheckoutPayment'), data2);
			}


			// Combine results of getExpressCheckout and DoExpress checkout payment.
			callback(null, _.extend(data, data2));
		});
	});

	return self;
};

/**
 * Add product for pricing.	
 * @param {array} products       item in arary = { name, description, quantity, amount }
 */
Paypal.prototype.setProducts = function(products) {
	this.products = products;
	return this;
};

/**
 * Get Items params.
 * @return {[type]} [description]
 */
Paypal.prototype.getItemsParams = function() {
	var params = {};
	// Add product information.
	for(var i = 0; i < this.products.length; i++) {
		if (this.products[i].name) {
			params['L_PAYMENTREQUEST_0_NAME' + i] = this.products[i].name;	
		}

		if (this.products[i].description) {
			params['L_PAYMENTREQUEST_0_DESC' + i] = this.products[i].description;	
		}

		if (this.products[i].amount) {
			params['L_PAYMENTREQUEST_0_AMT' + i] = prepareNumber(this.products[i].amount);	
		}

		if(this.products[i].quantity) {
			params['L_PAYMENTREQUEST_0_QTY' + i] = this.products[i].quantity;	
		}
	}

	return params;
};

/**
 * Pay.
 * @param {string} email [description]
 * @param  {String}   invoiceNumber [description]
 * @param  {Number}   amount         [description]
 * @param  {String}   description   [description]
 * @param  {String}   currency      EUR, USD
 * @param  {Function} callback      [description]
 * @return {PayPal}                 [description]
 */
Paypal.prototype.setExpressCheckoutPayment = function(email, invoiceNumber, amount, description, currency, returnUrl, cancelUrl, onlyPayPalUsers, callback) {
	var self = this;
	var params = self.params();
	if (email) {
		params.EMAIL = email;
	}

	params.SOLUTIONTYPE = onlyPayPalUsers === true ? 'Mark' : 'Sole';
	params.PAYMENTREQUEST_0_AMT = prepareNumber(amount);
	params.PAYMENTREQUEST_0_DESC = description;
	params.PAYMENTREQUEST_0_CURRENCYCODE = currency;
	params.PAYMENTREQUEST_0_INVNUM = invoiceNumber;
	params.PAYMENTREQUEST_0_CUSTOM = invoiceNumber + '|' + params.PAYMENTREQUEST_0_AMT + '|' + currency;
	params.PAYMENTREQUEST_0_PAYMENTACTION = 'Sale';
	params.PAYMENTREQUEST_0_ITEMAMT = prepareNumber(amount);

	params = _.extend(params, this.getItemsParams());

	params.RETURNURL = returnUrl;
	params.CANCELURL = cancelUrl;

	params.NOSHIPPING = 1;
	params.ALLOWNOTE = 1;
	params.REQCONFIRMSHIPPING = 0;
	params.METHOD = 'SetExpressCheckout';

	params = _.extend(params, this.payOptions);
	
	self.request(self.url, 'POST', params, function(err, data) {
		if (err) {
			callback(err);
			return;
		}

		if (data.ACK === 'Success') {
			callback(null, { 
				redirectUrl: self.redirect + '?cmd=_express-checkout&useraction=commit&token=' + data.TOKEN, 
				token: data.TOKEN 
			});
			return;
		}

		callback(new Error('ACK ' + data.ACK + ': ' + data.L_LONGMESSAGE0));
	});

	return self;
};

/**
 * Do express checkout payment.
 * @param {object} params returned by getExpressCheckoutDetails callback.
 * @return {[type]} [description]
 */
Paypal.prototype.doExpressCheckoutPayment = function(params, callback) {
	var self = this;
	params.METHOD = 'DoExpressCheckoutPayment';	

	self.request(self.url, 'POST', params, function(err, data) {
		if (err) {
			callback(err);
			return;
		}
		
		callback(null, data);
	});

	return this;
};
	
/**
 * Set some options used for payments.
 * @param {string} hdrImageUrl        [description]
 * @param {string} logoUrl         [description]
 * @param {string} backgroundColor [description]
 * @param {string} cartBorderColor [description]
 * @param {string} brandName       [description]
 * @param {number} requireShipping [description]
 * @param {number} noShipping      [description]
 */
Paypal.prototype.setPayOptions = function(brandName, hdrImageUrl, logoUrl, backgroundColor, cartBorderColor, requireShipping, noShipping, allowNote) {
	this.payOptions = {};

	if (brandName) {
		this.payOptions.BRANDNAME = brandName;
	}

	if (hdrImageUrl) {
		this.payOptions.HDRIMG = hdrImageUrl;
	}

	if (logoUrl) {
		this.payOptions.LOGOIMG = logoUrl;
	}

	if (backgroundColor) {
		this.payOptions.PAYFLOWCOLOR = backgroundColor;
	}

	if (cartBorderColor) {
		this.payOptions.CARTBORDERCOLOR = cartBorderColor;
	}

	if (requireShipping !== undefined) {
		this.payOptions.REQCONFIRMSHIPPING = requireShipping ? 1 : 0;
	}

	if (noShipping !== undefined) {
		this.payOptions.NOSHIPPING = noShipping ? 1 : 0;
	}

	if (allowNote !== undefined) {
		this.payOptions.ALLOWNOTE = allowNote ? 1 : 0;
	}

	return this;
};

/**
 * Special Request function that uses NVP refered from Classic PayPal API.
 * @param  {string}   url      [description]
 * @param  {string}   method   [description]
 * @param  {object}   data     [description]
 * @param  {Function} callback [description]
 * @return {Paypal}            [description]
 */
Paypal.prototype.request = function(url, method, data, callback) {
	var self = this;
	var params = querystring.stringify(data);

	if (method === 'GET') {
		url += '?' + params;
	}

	var uri = urlParser.parse(url);
	var headers = {};

	headers['Content-Type'] = method === 'POST' ? 'application/x-www-form-urlencoded' : 'text/plain';
	headers['Content-Length'] = params.length;

	var options = { 
		protocol: uri.protocol, 
		auth: uri.auth, 
		method: method || 'GET', 
		hostname: uri.hostname, 
		port: uri.port, 
		path: uri.path, 
		agent: false, 
		headers: headers 
	};

	// Make HTTPS request.
	var req = https.request(options, function(res) {
		var buffer = '';

		res.on('data', function(chunk) {
			buffer += chunk.toString('utf8');
		});

		// Set timeout on request.
		req.setTimeout(exports.timeout, function() {
			callback(new Error('timeout'), null);
		});

		res.on('end', function() {
			var error = null;
			var data = '';

			if (res.statusCode > 200) {
				error = new Error(res.statusCode);
				data = buffer;
			} else {
				data = querystring.parse(buffer);
			}

			callback(error, data);
		});
	});

	if (method === 'POST') {
		req.end(params);
	} else {
		req.end();
	}

	return self;
};

/**
 * Default timeout is 10s.
 * @type {Number}
 */
exports.timeout = 10000;

/**
 * Export paypal object.
 * @type {[type]}
 */
exports.Paypal = Paypal;

/**
 * Create Paypal object. Wrapper around constructor.
 */
exports.create = function(username, password, signature, debug) {
	return new Paypal(username, password, signature, debug);
};