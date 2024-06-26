import React, { useContext } from 'react';
import { EContext } from '../Context/Econtext';
import { useParams } from 'react-router-dom';
import Breadcrum from '../Components/Breadcrums/Breadcrum';
import Productdetail from '../Components/ProductDetail/Productdetail';

const Product = () => {
  const {all_product} = useContext(EContext);
  const {productId} = useParams();
  if(all_product && productId)  {
    const product = all_product.find((e)=>e.id === Number(productId))
    if(!product) {
      return (
        <div>Loading...</div>
      )
    }
  }


  const product = all_product.find((e)=>e.id === Number(productId))
  return (
    <div>
      <Breadcrum product={product}/>
      <Productdetail product={product}/>
    </div>
  );
}

export default Product;