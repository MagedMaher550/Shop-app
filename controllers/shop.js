const fs = require("fs");
const path = require("path");

const PDF = require("pdfkit");
const stripe = require("stripe")(process.env.STRIPE_KEY || 'sk_test_51HjnAEDIjkFF0MQlom2ipD3f8IRwMfTg5qO06NlFoLNm2O6EsP10YPJSsdSZorbQEJfNM2xgjJONUM56GldTnyNP00zZnh6xvY');

const Product = require('../models/product');
const Order = require('../models/order');

const throwServerError = require("../util/serverErrorThrower");
const order = require('../models/order');

const ITEMS_PER_PAGE = 6;


const renderShopAndIndex = (req, res, next, renderPath, pageTitle, path) => {
  const page = +req.query.page || 1;
  let totalNumberOfProducts;
  let lastPage;

  Product.find()
    .countDocuments()
    .then(numberOfProducts => {
      totalNumberOfProducts = numberOfProducts;
      lastPage = Math.ceil(totalNumberOfProducts/ITEMS_PER_PAGE);
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE)
    })
    .then(products => {
      res.render(renderPath, {
        prods: products,
        pageTitle: pageTitle,
        path: path,
        itemsPerPage: ITEMS_PER_PAGE,
        totalNumberOfProducts: totalNumberOfProducts,

        lastPage: lastPage,
        page: page,

        hasNextPage: page + 1 <= lastPage,
        hasNextNextPage: page + 2 <= lastPage,

        hasPreviousPage: page - 1 >= 1,
        hasPreviousPreviousPage: page - 2 >= 1,

        nextPage: page + 1,
        previousPage: page - 1,
        
        nextNextPage: page + 2,
        previousPreviousPage: page - 2
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
}

exports.getIndex = (req, res, next) => {
  return renderShopAndIndex(req, res, next, "shop/index", "Shop", "/")
};

exports.getProducts = (req, res, next) => {
  return renderShopAndIndex(req, res, next, "shop/product-list", "Products", "/products");
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products',
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items;
      const totalPrice = user.cart.totalPrice;
      res.render('shop/cart', {
        path: '/cart',
        pageTitle: 'Your Cart',
        products: products,
        totalPrice: totalPrice,
        // isAuthenticated: req.session.isLoggedIn 
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.addToCart = (req, res, next) => {
  
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      return req.user.addToCart(product);
    })
    .then(result => {
      res.status(200).json({
        "message": "Success"
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({"message": "Adding Product to Cart Failed"});
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .deleteItemFromCart(prodId)
    .then(result => {
      res.redirect('/cart');
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.postClearCart = (req,res, next) => {
  req.user
  .clearCart()
  .then(result => {
    return res.redirect("/cart");
  })
  .catch(err => {
    console.log(err);
    return next(err);
  })
}

exports.getCheckOut = (req, res, next) => {
  let products;
  let totalPrice;

  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      products = user.cart.items;
      totalPrice = user.cart.totalPrice;

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map(product => {
          return {
            name: product.productId.title,
            description: product.productId.description,
            amount: +product.productId.price * 100,
            currency: "usd",
            quantity: product.quantity
          };
        }),
        success_url: req.protocol + "://" + req.get("host") + "/checkout/success",
        cancel_url: req.protocol + "://" + req.get("host") + "/checkout/cancel"
      });
    })
    .then(session => {
      res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products: products,
        totalPrice: totalPrice,
        sessionId: session.id
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
}

exports.postOrder = (req, res, next) => {
  req.user
    .populate('cart.items.productId')
    .execPopulate()
    .then(user => {
      const products = user.cart.items.map(i => {
        return {
          quantity: i.quantity,
          product: {
            ...i.productId._doc
          }
        };
      });
      const orderPrice = user.cart.totalPrice;
      const order = new Order({
        user: {
          email: req.user.email,
          userId: req.user
        },
        products: products,
        orderPrice: orderPrice
      });
      return order.save();
    })
    .then(result => {
      req.user.clearCart();
    })
    .then(reuslt => {
      res.redirect("/orders");
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({
      'user.userId': req.user._id
    })
    .then(orders => {
      res.render('shop/orders', {
        path: '/orders',
        pageTitle: 'Your Orders',
        orders: orders,
        // isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;

  Order.findById(orderId)
    .then(order => {
      if(!order){
        return next(new Error("No order found."))
      } else if(order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Unauthorized"));
      } else {
        const invoiceName = "invoice" + "-" + orderId + ".pdf";
        const invoicePath = path.join("data", "invoices", invoiceName);

        const pdf = new PDF();
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename= " + invoiceName + "'");

        pdf.pipe(fs.createWriteStream(invoicePath));
        pdf.pipe(res);

        pdf.fontSize(20).text("Order Data", {
          align: "center"
        });

        pdf.moveDown();
        let counter = 1
        
        order.products.forEach(item => {
          const itemQuantity = item.quantity;
          const itemTitle = item.product.title;
          const itemPrice = item.product.price;

          pdf.fontSize(18).text("Order Item " + counter + ":");
          pdf.fontSize(15)
            .text("     Title: " + itemTitle)
            .text("     Price: " + itemPrice + " $")
            .text("     Quantity: " + itemQuantity)

          pdf.moveDown();
          counter += 1;
        });

        pdf.moveDown();
        pdf.fontSize(18)
          .text("Order Total Price: " + order.orderPrice + " $" , {
            align: "center"
          });

        pdf.end()

      }
    })
    .catch(err => {
      console.log(err);
      return throwServerError(next,err);     
    })
}

