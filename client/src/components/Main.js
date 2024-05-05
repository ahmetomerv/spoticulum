import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './Home';
import CollectionCanvas from './CollectionCanvas/CollectionCanvas';
import Legal from './Legal/Legal';

const Main = () => {
  return (
    <Routes>
      <Route exact path='/' element={<Home/>} />
      <Route exact path='/collection' element={<CollectionCanvas/>} />
      <Route exact path='/legal' element={<Legal/>} />
      <Route path='*' element={<Navigate to='/' />} />
    </Routes>
  );
}

export default Main;
