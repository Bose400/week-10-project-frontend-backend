import React, { createContext, useEffect, useState } from "react";

// Function to initialize cart items
const getCart = () => {
  // Try to get the cart from local storage
  const storedCart = localStorage.getItem("cartData");
  if (storedCart) {
    // Parse the stored cart if it exists
    return JSON.parse(storedCart);
  } else {
    // Return an empty object if no cart is stored
    return {};
  }
};

// Create context for global state management
export const EContext = createContext(null);

const EContextProvider = (props) => {
  // State for all products and cart items
  const [all_product, setAllProduct] = useState([]);
  const [cartItems, setCartItems] = useState(getCart);

  async function fetchProducts() {
    try {
      const response = await fetch("http://localhost:5000/allproducts");
      const data = await response.json();
      setAllProduct(data);
      // Store the product data in localStorage
      localStorage.setItem("productData", JSON.stringify(data));
    } catch (error) {
      console.error("Error fetching products:", error);
      // Handle the error appropriately
    }
  }

  // Fetch all products and cart data on component mount
  useEffect(() => {
  // Fetch all products from the server
  fetchProducts();

  // Check if user is logged in and fetch cart data if available
  if (localStorage.getItem("auth-token")) {
    fetch("http://localhost:5000/getdataforcart", {
      method: "POST",
      headers: {
        Accept: "application/form-data",
        "auth-token": `${localStorage.getItem("auth-token")}`,
        "Content-Type": "application/json",
      },
      body: "",
    })
      .then((response) => response.json())
      .then((data) => {
        // Check if the server response contains a 'cartData' property
        if (data.cartData) {
          setCartItems(data.cartData);
        } else {
          console.log("No cart data received from the server");
          setCartItems([]); // Set cartItems to an empty array
        }
      })
      .catch((error) => {
        console.error("Error fetching cart data:", error);
        setCartItems([]); // Set cartItems to an empty array on error
      });
  }
  console.log(localStorage.getItem("cartData"));
}, []);


  // Function to add items to the cart
  const addToCart = (itemId) => {
    setCartItems((prev) => ({ ...prev, [itemId]: (prev[itemId] || 0) + 1 }));

    // Store cart data in localStorage
    const cartData = JSON.parse(localStorage.getItem("cartData") || "{}");
    cartData[itemId] = (cartData[itemId] || 0) + 1;
    localStorage.setItem("cartData", JSON.stringify(cartData));

    // If the user is logged in, send request to server to update cart data
    const authToken = localStorage.getItem("auth-token");
    if (authToken) {
      fetch("http://localhost:5000/addtocart", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => console.log(data));
    }
  };

  // Function to remove items from the cart
  const removeFromCart = (itemId) => {
    // Update local state
    setCartItems((prev) => {
      const updatedCart = { ...prev };
      if (updatedCart[itemId] > 1) {
        updatedCart[itemId] -= 1;
      } else {
        delete updatedCart[itemId];
      }
      return updatedCart;
    });

    // Update cart data in localStorage
    const cartData = JSON.parse(localStorage.getItem("cartData") || "{}");
    if (cartData[itemId] > 1) {
      cartData[itemId] -= 1;
    } else {
      delete cartData[itemId];
    }
    localStorage.setItem("cartData", JSON.stringify(cartData));

    // If the user is logged in, send request to server to update cart data
    const authToken = localStorage.getItem("auth-token");
    if (authToken) {
      fetch("http://localhost:5000/removefromcart", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": authToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ itemId: itemId }),
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("Item removed from cart");
          } else {
            console.error("Error removing item from cart");
          }
        })
        .catch((error) => {
          console.error("Error removing item from cart:", error);
        });
    }
  };

  // Write a clear cart function
  const clearCart = () => {
    setCartItems([]); // Set cartItems to an empty array
    localStorage.removeItem("cartData");

    // If the user is logged in, send request to server to clear cart data
    const authToken = localStorage.getItem("auth-token");
    if (authToken) {
      fetch("http://localhost:5000/clearcart", {
        method: "POST",
        headers: {
          Accept: "application/form-data",
          "auth-token": authToken,
          "Content-Type": "application/json",
        },
        body: "",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success) {
            console.log("Cart cleared successfully");
          } else {
            console.error("Error clearing cart");
          }
        })
        .catch((error) => {
          console.error("Error clearing cart:", error);
        });
    } else {
      localStorage.removeItem("cartData");
      console.log("Cart cleared successfully");
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
        total += itemDetail.new_price * cartItemValues[i];
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
        console.log(itemDetail);
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
    clearCart,
  };

  // Provide context value to child components
  return (
    <EContext.Provider value={contextValue}>{props.children}</EContext.Provider>
  );
};

export default EContextProvider;
