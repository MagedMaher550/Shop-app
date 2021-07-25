const { validationResult } = require("express-validator");

const User = require('../models/user');
const Product = require('../models/product');
const Order = require('../models/order');

const throwServerError = require("../util/serverErrorThrower");
const fileHelper = require("../util/file");

exports.getAddProduct = (req, res, next) => {
  res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    product: {
      tile: "",
      imageUrl: "",
      price: "",
      description: ""
    },
    errorMessage: [],
    validationErrors: []
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  const price = req.body.price;
  const description = req.body.description;

  console.log(image);

  if(!image) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      validationErrors: [],
      errorMessage: "Attached file is not supported"
    });

  }

  const errors = validationResult(req);
  const errorMsgs = [];

  if(!errors.isEmpty()) {
    errors.array().forEach(err => {
      errorMsgs.push(err.msg);
    });

    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true,
      product: {
        title: title,
        price: price,
        description: description
      },
      validationErrors: errors.array(),
      errorMessage: errorMsgs
    });
  }

  const imageUrl = image.path;

  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        hasError: false,
        product: product,
        errorMessage: [],
        validationErrors: []
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true,
      product: {
        title: updatedTitle,
        price: updatedPrice,
        description: updatedDesc,
        _id: prodId
      },
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array()
    });
  }

  Product.findById(prodId)
    .then(product => {
      if (product.userId.toString() !== req.user._id.toString()) {
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if (image) {
        if(product.imageUrl) {
          fileHelper.deleteFile(product.imageUrl);
        }
        product.imageUrl = image.path;
      }
       return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    })
    .catch(err => {
      return throwServerError(next,err);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({
    userId: req.user._id
  })
    .then(products => {
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.deleteProduct = (req, res, next) => {
  console.log("GOT IN DELETE");
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then(product => {
      if(!product) {
        return new Error("Product Not Found");
      }
      return fileHelper.deleteFile(product.imageUrl);
    })
    .then(result => {
      Product.deleteOne({
        _id: prodId,
         userId: req.user._id
      })
        .then(() => {
          console.log('DESTROYED PRODUCT');
          res.status(200).json({"message": "Success"});
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({"message": "Deleting Product Failed"});
        });
    })
    .catch(err => {
      return throwServerError(err);
    })
};

exports.getMyAccount = (req, res, next) => {
  const numbersOfItemsInCart = req.user.cart.items.length;
  const cartTotalPrice = req.user.cart.totalPrice;
  const userEmail = req.user.email;
  let numberOfOrders = 0;
  let OrdersTotalPrice = 0;
  let numberOfProductsAdded = 0;

  Order.find({
    "user.userId": req.user._id
  })
  .then(orders => {
    numberOfOrders = orders.length;
    return orders.forEach(order => {
      OrdersTotalPrice += parseFloat(order.orderPrice);
    });
  })
  .then(result => {
    return Product.find({
      userId: req.user._id
    })
    .then(products => {
      numberOfProductsAdded = products.length;
    })
  })
  .then(result => {
    res.render('admin/my-account', {
      pageTitle: 'My Account',
      path: '/admin/my-account',
      numbersOfItemsInCart: numbersOfItemsInCart,
      cartTotalPrice: cartTotalPrice,
      numberOfOrders: numberOfOrders,
      OrdersTotalPrice: OrdersTotalPrice,
      userEmail: userEmail,
      numberOfProductsAdded: numberOfProductsAdded
    });  
  })
  .catch(err => {
    console.log(err);
    return throwServerError(next,err);
  });
};

exports.getDeleteAccount = (req, res, next) => {
    res.render('admin/delete-account', {
      pageTitle: 'Delete Account',
      path: '/admin/delete-account'
    });
};

exports.postDeleteAccount = (req, res, next) => {
  const userId = req.user._id;
  const productIds = [];
  const answer = req.body.check;

  if(answer === "No") {
    return res.redirect("/admin/products");
  }

  Product.find({
    userId: userId
  })
  .then(products => {
    return products.forEach(product => {
      productIds.push(product._id);
    });
  })
  .then(result => {
    return Product.deleteMany({
      _id: {
        $in: productIds
      }
    });
  })
  .then(result => {
    return req.session.destroy(err => {
      console.log(err);  
    });
  })
  .then(result => {
    return User.deleteOne({
      _id: userId
    });
  })
  .then(result => {
    console.log("User Deleted.");
    res.redirect("/");
  })
  .catch(err => {
    console.log(err);
    return throwServerError(next,err);
  });
};
