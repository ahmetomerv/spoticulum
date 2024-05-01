import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import CollectionCanvas from './CollectionCanvas/CollectionCanvas';

const Main = () => {
  return (
    <Routes>
      <Route exact path='/' element={<Home/>} />
      <Route exact path='/collection' element={<CollectionCanvas/>} />
    </Routes>
  );
}

export default Main;
