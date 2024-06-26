import React, { createContext, useEffect, useState } from "react";

// Function to initialize cart items
const getCart = () => {
  // Try to get the cart from local storage
  const storedCart = localStorage.getItem("cart");
  if (storedCart) {
    // Parse the stored cart if it exists
    return JSON.parse(storedCart);
  } else {
    // Return an empty object if no cart is stored
    return {};
  }
};

function clearCart() {
  // Check if 'cart' exists in local storage
  if (localStorage.getItem("cart")) {
    // Clear 'cart' from local storage
    localStorage.removeItem("cart");
    console.log("Cart has been cleared.");
  } else {
    console.log("Cart is already empty.");
  }
}

// Create context for global state management
export const EContext = createContext(null);

const EContextProvider = (props) => {
  // State for all products and cart items
  const [all_product, setAllProduct] = useState([]);
  const [cartItems, setCartItems] = useState(getCart);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch cart data from server on component mount
  useEffect(() => {
    if (localStorage.getItem("auth-token")) {
      fetch("http://localhost:5000/getdataforcart", {
        method: "GET",
        headers: {
          Accept: "application/form-data",
          "auth-token": `${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => setCartItems(data));
    }
  }, []);

  // Fetch product data from server
  useEffect(() => {
    fetch("http://localhost:5000/allproducts") // Replace with your actual endpoint
      .then((response) => response.json())
      .then((data) => {
        setAllProduct(data);
        setIsLoading(false); // Set loading to false after products are loaded
      });
  }, []);

  // Function to add items to the cart
  const addToCart = (itemId) => {
    // Send request to server to add item
    if (localStorage.getItem("auth-token")) {
      fetch("http://localhost:5000/addtocart", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": `${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => {
          // Update cart state and local storage
          setCartItems(data);
          localStorage.setItem("cart", JSON.stringify(data));
        });
    }
  };

  // Function to remove items from the cart
  const removeFromCart = (itemId) => {
    // Send request to server to remove item
    if (localStorage.getItem("auth-token")) {
      fetch("http://localhost:5000/deletefromcart", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": `${localStorage.getItem("auth-token")}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => {
          // Update cart state and local storage
          setCartItems(data);
          localStorage.setItem("cart", JSON.stringify(data));
        });
    }
  };

  // Function to calculate total item count in the cart
  const getTotalItemCount = () => {
    let total = 0;
    const cartItemValues = Object.values(cartItems);

    for (let i = 0; i < cartItemValues.length; i++) {
      if (cartItemValues[i] > 0) {
        const itemId = Object.keys(cartItems)[i];
        const itemDetail = all_product.find(
          (product) => product.id === Number(itemId)
        );

        // Check if itemDetail is found
        if (itemDetail) {
          total += itemDetail.new_price * cartItemValues[i];
        } else {
          // Handle the case where the item is not found
          console.error(`Product with ID ${itemId} not found in all_product`);
        }
      }
    }

    return total;
  };

  // Function to calculate total count of items in the cart
  const getTotalCount = () => {
    let total = 0;
    const cartItemValues = Object.values(cartItems);

    for (let i = 0; i < cartItemValues.length; i++) {
      if (cartItemValues[i] > 0) {
        const itemId = Object.keys(cartItems)[i];
        const itemDetail = all_product.find(
          (product) => product.id === Number(itemId)
        );
        total += cartItemValues[i];
      }
    }
    return total;
  };

  // Context value containing all necessary functions and state
  const contextValue = {
    getTotalCount,
    getTotalItemCount,
    all_product,
    cartItems,
    addToCart,
    removeFromCart,
  };

  // Provide context value to child components
  return (
    <EContext.Provider value={contextValue}>{props.children}</EContext.Provider>
  );
};

export default EContextProvider;






const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define User schema
const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  cart: {
    type: Object,
    default: {},
  },
});

// Create User model
const User = mongoose.model("User", UserSchema);

// Define Product schema
const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  category: {
    type: String,
    required: true,
  },
});

// Create Product model
const Product = mongoose.model("Product", ProductSchema);

// Storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

// Multer instance for handling image uploads
const upload = multer({ storage: storage });

// Register new user
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    // Save user to database
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET);

    // Send response with token
    res.status(201).json({ message: "User registered successfully", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login existing user
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);

    // Send response with token
    res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get all products
app.get("/allproducts", async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Get data for cart
app.get("/getdataforcart", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Send user's cart data
    res.status(200).json(user.cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Add item to cart
app.post("/addtocart", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get item ID from request body
    const { itemId } = req.body;

    // Add item to cart
    user.cart[itemId] = (user.cart[itemId] || 0) + 1;

    // Save updated user
    await user.save();

    // Send updated cart data
    res.status(200).json(user.cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete item from cart
app.post("/deletefromcart", async (req, res) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get item ID from request body
    const { itemId } = req.body;

    // Delete item from cart
    delete user.cart[itemId];

    // Save updated user
    await user.save();

    // Send updated cart data
    res.status(200).json(user.cart);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Upload product image
app.post("/upload", upload.single("image"), async (req, res) => {
  try {
    const { name, description, price, category } = req.body;
    const image = req.file.filename;

    // Create new product
    const newProduct = new Product({
      name,
      description,
      price,
      image,
      category,
    });

    // Save product to database
    await newProduct.save();

    res.status(201).json({ message: "Product created successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
