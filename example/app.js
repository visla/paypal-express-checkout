'use strict';

var express = require('express');
var favicon = require('static-favicon');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var path = require('path');
var app = express();
var uuid = require('node-uuid');
var PayPal = require('../index');

// TODO: Put your PayPal settings here:
var returnUrl = 'http://localhost:8893/paypal/success';
var cancelUrl = 'http://localhost:8893/paypal/cancel';

app.use(favicon());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * React to pay POST. This will create paypal pay url and redirect user there. 
 * @param  {[type]} req  [description]
 * @param  {[type]} res) {}          [description]
 * @return {[type]}      [description]
 */
app.post('/pay', function(req, res) {
	// create paypal object in sandbox mode. If you want non-sandbox remove tha last param.
	var paypal = PayPal.create(process.env.API_USERNAME, process.env.API_PASSWORD, process.env.SIGNATURE, true);
	paypal.setPayOptions('ACME Soft', null, process.env.logoImage, '00ff00', 'eeeeee');

	paypal.setProducts([{ 
		name: 'ACME Drill', 
		description: 'Amazing drill', 
		quantity: 1, 
		amount: 100.99 
	}]);

	// Invoice must be unique.
	var invoice = uuid.v4();
	paypal.setExpressCheckoutPayment(
		'test@email.com', 
		invoice, 
		100.99, 
		'This is really amazing product you are getting', 
		'USD', 
		returnUrl, 
		cancelUrl, 
		false,
		function(err, data) {
		if (err) {
			console.log(err);
			res.status(500).send(err);
			return;
		}

		// Regular paid.
		res.redirect(data.redirectUrl);
	});
});

app.get('/paypal/cancel', function(req, res) {
	// Cancel payment.
	res.send('Payment canceled');
});

app.get('/paypal/success', function(req, res) {
	var paypal = PayPal.create(process.env.API_USERNAME, process.env.API_PASSWORD, process.env.SIGNATURE, true);
	paypal.getExpressCheckoutDetails(req.query.token, true, function(err, data) {
		if (err) {
			console.log(err);
			res.status(500).send(err);
			return;
		}

		// Check token and details.
		var resObj = JSON.stringify(data);
		res.send('Successfuly payment, ' + resObj);
	});
});
	
/// catch 404 and forwarding to error handler
app.use(function(req, res) {
	res.status(404).send('Unknown page');
});

// run App;
var server = app.listen(8893, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Example app listening at http://%s:%s', host, port);
});
