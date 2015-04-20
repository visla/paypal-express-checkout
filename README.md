# paypal-express-checkout
PayPal Express Checkout implementation in Node.JS

Installation:


Examples:

1. Update example/app.js with your paypal sandbox credentials
2. Run npm example and go to http://localhost:8893/index.html
3. you will see the full paypal flow 

Tests:

1. Run npm test to make sure everything works fine.

Usage:

Checkout example/app.js code which is using express. But here are some steps:

1) Place paypal checkout button on your website. When clicked on that button redirect to your 'pay' handler. (in this example app.post('/pay') was used)
2) Call setExpressCheckoutPayment with required details or call setProducts and setPayOptions before
3) Redirect to the url provided in callback of setExpressCheckoutPayment
4) User will approve or cancel payment on paypal redirecting back to redirectUrl or CancelUrl
5) If redirectUrl was used make GET handler (in the example its /paypal/success) and call getExpressCheckoutDetails (set second param to be true as you most likely wish to charge immediately)
6) Success of getExpressCheckoutDetails will return object you can store as charge details.  