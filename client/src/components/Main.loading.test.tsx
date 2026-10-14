import type { ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import Main from "./Main";

const routeModules = vi.hoisted(() => {
  const deferred = <T,>() => {
    let resolve: (value: T) => void = () => {};
    const promise = new Promise<T>((res) => {
      resolve = res;
    });
    return { promise, resolve: (value: T) => resolve(value) };
  };
  return {
    legal: deferred<{ default: () => ReactElement }>(),
    collection: deferred<{ default: () => ReactElement }>(),
  };
});

vi.mock("./Legal/Legal", () => routeModules.legal.promise);
vi.mock(
  "./CollectionCanvas/CollectionCanvas",
  () => routeModules.collection.promise,
);

test("a direct legal visit announces loading until the route module arrives", async () => {
  render(
    <MemoryRouter initialEntries={["/legal"]}>
      <Main />
    </MemoryRouter>,
  );

  expect(screen.getByRole("status", { name: "Loading page" })).toBeVisible();
  routeModules.legal.resolve({
    default: function LegalRoute() {
      return <h1>Terms of Service</h1>;
    },
  });
  expect(
    await screen.findByRole("heading", { name: "Terms of Service" }),
  ).toBeVisible();
  expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull();
});

test("a direct collection visit announces loading until the route module arrives", async () => {
  render(
    <MemoryRouter initialEntries={["/collection"]}>
      <Main />
    </MemoryRouter>,
  );

  expect(screen.getByRole("status", { name: "Loading page" })).toBeVisible();
  routeModules.collection.resolve({
    default: function CollectionRoute() {
      return <h1>Your collection</h1>;
    },
  });
  expect(
    await screen.findByRole("heading", { name: "Your collection" }),
  ).toBeVisible();
  expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull();
});
