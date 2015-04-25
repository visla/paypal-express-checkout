'use strict';
var https = require('https');
var Paypal = require('../index');
var assert = require('assert');

describe('Test paypal-express-checkout', function() {
	var fakeResponse = {
		on: function(event, callback) {
			if (event === 'data') {
				setTimeout(function() {
					callback('ACK=Success&TOKEN=new_token');
				}, 100);
			} else if (event === 'end') {
				setTimeout(function() {
					callback();
				}, 300);
			} else {
				callback();
			}
		},
		statusCode: 200,
	};

	var fakeRequest = {
		end: function(params) {
			console.log('Body of request: ', params);
		},
		setTimeout: function() {
			// nothing here. Never timeout. 
		},
	};

	beforeEach(function(done) {
		// Mock http.request call.
		https.request = function(options, callback) {
			console.log('Options: ', options);
			// return fake response.
			setTimeout(function() {
				callback(fakeResponse);
			}, 100);

			return fakeRequest;
		};

		done();
	});

	/**
	 * Testing valid pay call.
	 * @param  {[type]} done) {		fakeRequest.end [description]
	 * @return {[type]}       [description]
	 */
	it('should test valid pay call', function(done) {

		fakeRequest.end = function(params) {
			assert.ok(params.indexOf('PAYMENTREQUEST_0_AMT=1000.99') !== -1);
			assert.ok(params.indexOf('EMAIL=test%40email.com') !== -1);
		};

		var paypal = Paypal.create('username', 'pswd', 'signature');
		paypal.setExpressCheckoutPayment('test@email.com', '001', 1000.99, 'Some description', 'USD', 'returnUrl', 'cancelUrl', false, function(err, data) {
			console.log('Redirect to paypal: ' + data.redirectUrl);
			assert.ok(data.redirectUrl.indexOf('new_token') !== -1);
			done();
		});
	});	

	/**
	 * Additional valid pay calls.
	 * @param  {[type]} done) {	}         [description]
	 * @return {[type]}       [description]
	 */
	it('should test valid pay call with additional options', function(done) {
		fakeRequest.end = function(params) {
			assert.ok(params.indexOf('PAYMENTREQUEST_0_AMT=1000.99') !== -1);
			assert.ok(params.indexOf('EMAIL=test%40email.com') !== -1);
			assert.ok(params.indexOf('HDRIMG=http%3A%2F%2Fhdrimage.jpg') !== -1);
			assert.ok(params.indexOf('LOGOIMG=http%3A%2F%2Flogoimg.jpg') !== -1);
			assert.ok(params.indexOf('PAYFLOWCOLOR=ff00ff') !== -1);
			assert.ok(params.indexOf('CARTBORDERCOLOR=ffffff') !== -1);
			assert.ok(params.indexOf('REQCONFIRMSHIPPING=0') !== -1);
			assert.ok(params.indexOf('NOSHIPPING=1') !== -1);
			assert.ok(params.indexOf('ALLOWNOTE=1') !== -1);
		};

		var paypal = Paypal.create('username', 'pswd', 'signature');
		paypal.setPayOptions('MyBrand', 'http://hdrimage.jpg', 'http://logoimg.jpg', 'ff00ff', 'ffffff');

		paypal.setExpressCheckoutPayment('test@email.com', '001', 1000.99, 'Some description', 'USD', 'returnUrl', 'cancelUrl', false, function(err, data) {
			console.log('Redirect to paypal: ' + data.redirectUrl);
			assert.ok(data.redirectUrl.indexOf('new_token') !== -1);
			done();
		});
	});

	/**
	 * Additional valid pay calls.
	 * @param  {[type]} done) {	}         [description]
	 * @return {[type]}       [description]
	 */
	it('should test valid pay call with additional options plus product info', function(done) {
		fakeRequest.end = function(params) {
			assert.ok(params.indexOf('PAYMENTREQUEST_0_AMT=1000.99') !== -1);
			assert.ok(params.indexOf('EMAIL=test%40email.com') !== -1);
			assert.ok(params.indexOf('HDRIMG=http%3A%2F%2Fhdrimage.jpg') !== -1);
			assert.ok(params.indexOf('LOGOIMG=http%3A%2F%2Flogoimg.jpg') !== -1);
			assert.ok(params.indexOf('PAYFLOWCOLOR=ff00ff') !== -1);
			assert.ok(params.indexOf('CARTBORDERCOLOR=ffffff') !== -1);
			assert.ok(params.indexOf('REQCONFIRMSHIPPING=1') !== -1);
			assert.ok(params.indexOf('NOSHIPPING=0') !== -1);
			assert.ok(params.indexOf('ALLOWNOTE=1') !== -1);
			assert.ok(params.indexOf('SOLUTIONTYPE=Sole') !== -1);
			assert.ok(params.indexOf('L_PAYMENTREQUEST_0_NAME0=product1') !== -1);
			assert.ok(params.indexOf('L_PAYMENTREQUEST_0_NAME1=product2') !== -1);
			assert.ok(params.indexOf('L_PAYMENTREQUEST_0_AMT0=10.99') !== -1);
			assert.ok(params.indexOf('L_PAYMENTREQUEST_0_QTY0=10') !== -1);
			assert.ok(params.indexOf('L_PAYMENTREQUEST_0_DESC0=description1') !== -1);
			assert.ok(params.indexOf('RETURNURL=returnUrl') !== -1);
			assert.ok(params.indexOf('CANCELURL=cancelUrl') !== -1);
		};

		var paypal = Paypal.create('username', 'pswd', 'signature');
		paypal.setPayOptions('MyBrand', 'http://hdrimage.jpg', 'http://logoimg.jpg', 'ff00ff', 'ffffff', true, false, true);
		paypal.setProducts([ 
			{
				name: 'product1', 
				description: 'description1', 
				quantity: 10, 
				amount: 10.99
			},
			{
				name: 'product2', 
				description: 'description2', 
				quantity: 10, 
				amount: 1000.99
			},
			]);

		paypal.setExpressCheckoutPayment('test@email.com', '001', 1000.99, 'Some description', 'USD', 'returnUrl', 'cancelUrl', false, function(err, data) {
			console.log('Redirect to paypal: ' + data.redirectUrl);
			assert.ok(data.redirectUrl.indexOf('new_token') !== -1);
			done();
		});
	});
});