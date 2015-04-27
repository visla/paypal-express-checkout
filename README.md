# paypal-express-checkout-simple
PayPal Express Checkout implementation in Node.JS

If you got confused by PayPal instructions, 
If you are looking on how to charge your customers with paypal this is the simple solution.
Whether you are using angularjs or any single page app or you just serve your html pages from node directly you can use this component.  

## Installation

npm install paypal-express-checkout-simple

## Examples

### Simplest example
1. Update example/app.js with your paypal sandbox credentials
2. Run "npm run-script example" and go to http://localhost:8893/index.html
3. you will see the full paypal flow 

## Tests

1. Run npm test to make sure everything works fine.

## Usage

Checkout example/app.js code which is using express. But here are some steps:

1. Place paypal checkout button on your website. When clicked on that button redirect to your 'pay' handler. (in this example app.post('/pay') was used)
2. Call setExpressCheckoutPayment with required details or call setProducts and setPayOptions before
3. Redirect to the url provided in callback of setExpressCheckoutPayment. 
4. User will approve or cancel payment on paypal redirecting back to redirectUrl or cancelUrl
5. If redirectUrl was used make GET handler (in the example its /paypal/success) and call getExpressCheckoutDetails (set second param to be true as you most likely wish to charge immediately). your redirectUrl will have this query values given from paypal ?TOKEN=<something>&PayerID=<payerId>
6. Success of getExpressCheckoutDetails will return object you can store as charge details.  

## How are we using paypal-express-checkout-simple component with angularjs:

1. When user clicks on PayPal button it makes REST POST call to /paypal/set-express-checkout url.
```
var request = {
     method: 'POST',
     url:  ApiEndpoint + '/paypal/set-express-checkcout',
     headers: {
       'Content-Type': 'application/json',
     },
     data: {
     	email: email,
     	discountCode: discountCode,
     	products: products,
     	successUrl: successUrl, // successUrl is something like - http://www.mysite.com/#/paypal/execute-charge
     	cancelUrl: cancelUrl,
     }
};

return $http(request);	
```
2. Server when it gets POST request to /paypal/set-express-checkout does something like this 
```
/**
 * Paypal checkout. Reacts on /paypal/set-express-checkout
 * @param  {[type]} req [description]
 * @param  {[type]} res [description]
 * @return {[type]}     [description]
 */
function paypalCheckout(orderData, req, res) {
	var cancelUrl = req.body.cancelUrl;
	var successUrl = req.body.successUrl;

	var paypal = PayPal.create(GLOBAL.config.paypal.apiUsername, GLOBAL.config.paypal.apiPassword, GLOBAL.config.paypal.signature, GLOBAL.config.paypal.sandbox);
	paypal.setPayOptions(GLOBAL.config.paypal.brandName, null, GLOBAL.config.paypal.logoUrl);

	var paypalItems = _.map(orderData.products, function(item) {
		return {
			name: item.name,
			description: item.description,
			quantity: item.userOptions.quantity,
			amount: item.price,
		};
	});

	paypal.setProducts(paypalItems);

	paypal.setExpressCheckoutPayment(
		orderData.email, 
		orderData.orderId, 
		orderData.totalDiscountedPrice, 
		'', 
		'USD', 
		successUrl, 
		cancelUrl, 
		false,
		function(err, data) {
			if (err) {
				logger.error('paypal seting express checkout payment failed.', err);
				res.status(500).send('Error setting paypal payment');
				return;
			}

			GLOBAL.dbConnection.query('INSERT INTO paypal_order_data (token, order_data) VALUES (?, ?)', [data.token, JSON.stringify(orderData)], function(err) {
				if (err) {
					logger.error('Storing paypal_order_data for orderId: %s with token: %s', orderData.orderId, data.token);
					return res.status(500).send('Error setting paypal payment. Failed storing order data.');
				}

				res.send({ redirectUrl: redirectUrl });
			});
	});
}
``` 
3. Client gets redirectUrl and does `window.location = response.data.redirectUrl`
4. Users will now see paypal page. Once everything is successful it will go to url like this one: http://www.mysite.com/#/paypal/execute-charge
5. When client sees "http://www.mysite.com/#/paypal/execute-charge" this one will have ?TOKEN=token&PayerID=something set from PayPal. This controller has code that looks like this:
```
var query = $location.search();

if (!query.token) {
	$scope.errorMessage = 'This call is not made from PayPal. Report this issue to support.';
} else {
	DataProvider.paypalSuccess(query.token).then(function(response) { // This one will call getExpressCheckoutDetails on server and perform actual charge
		if (response.status === 200) {
			// Successful checkout, go to order success.
			$location.path('/order-processed/' + response.data.orderId);
		} else {
			$scope.errorMessage = 'Error executing paypal.' + query.token;
		}
	}).catch(function() {
		$scope.errorMessage = 'Error performing paypalSuccess request' + query.token;
	});	
} 
```
6. Server will create paypal object with appropriate credentials, and call getExpressCheckoutDetails with provided token.

This is simplified version of how we implemented this component. 

## 
Please feel free to comment and contribute.

## License 
MIT
