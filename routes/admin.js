const path = require('path');

const express = require('express');
const { body } = require("express-validator");

const adminController = require('../controllers/admin');
const isAuth = require("../middleware/isAuth");

const router = express.Router();

router.get('/add-product', isAuth, adminController.getAddProduct);

router.get('/products', isAuth, adminController.getProducts);

router.get('/edit-product/:productId', isAuth, adminController.getEditProduct);

router.get('/my-account', isAuth, adminController.getMyAccount);

router.post(
    '/add-product',
    [
        body("title")
            .isString()
            .withMessage("Please Enter a valid string.")
            .isLength({min: 5, max: 50})
            .withMessage("Title's should be between 5 and 50 characters'")
            .trim()
            ,
        body("description")
            .isLength({min: 10, max:400})
            .withMessage("Description should be atleast 10 characters long.")
            .trim()
    ],
     isAuth, adminController.postAddProduct
);

router.post(
    '/edit-product',
    [
        body("title")
            .isString()
            .withMessage("Please Enter a valid string.")
            .isLength({min: 5, max: 30})
            .withMessage("Title's should be between 5 and 30 characters'")
            .trim()
            ,
        body("description")
            .isLength({min: 10, max:400})
            .withMessage("Description should be atleast 10 characters long.")
            .trim()
    ],
     isAuth, adminController.postEditProduct
);

router.delete('/product/:productId', isAuth, adminController.deleteProduct);

router.post('/delete-account', isAuth, adminController.postDeleteAccount);

module.exports = router;
