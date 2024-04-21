import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './Home';
import CanvasGraph from './CanvasGraph/CanvasGraph';

const Main = () => {
  return (
    <Routes>
      <Route exact path='/' element={<Home/>} />
      <Route exact path='/graph' element={<CanvasGraph/>} />
    </Routes>
  );
}

export default Main;
