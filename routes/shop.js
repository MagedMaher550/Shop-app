const express = require('express');

const shopController = require('../controllers/shop');
const isAuth = require("../middleware/isAuth");

const router = express.Router();

router.get('/', shopController.getIndex);

router.get('/products', shopController.getProducts);

router.get('/products/:productId', shopController.getProduct);

router.get('/cart', isAuth, shopController.getCart);

router.post('/cart/:productId', isAuth, shopController.addToCart);

router.post('/cart-delete-item', isAuth, shopController.postCartDeleteProduct);

router.post('/clear-cart', isAuth, shopController.postClearCart);

router.get('/orders', isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

router.get('/checkout', isAuth, shopController.getCheckOut);

router.get('/checkout/success', isAuth, shopController.postOrder);

router.get('/checkout/cancel', isAuth, shopController.getCheckOut);

module.exports = router;
