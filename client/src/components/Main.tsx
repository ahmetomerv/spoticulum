import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./Home";
import Spinner from "../Spinner";

const CollectionCanvas = lazy(
  () => import("./CollectionCanvas/CollectionCanvas"),
);
const Legal = lazy(() => import("./Legal/Legal"));

function RouteFallback() {
  return <Spinner text="Loading page" />;
}

const Main = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/collection"
        element={
          <Suspense fallback={<RouteFallback />}>
            <CollectionCanvas />
          </Suspense>
        }
      />
      <Route
        path="/legal"
        element={
          <Suspense fallback={<RouteFallback />}>
            <Legal />
          </Suspense>
        }
      />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
};

export default Main;
