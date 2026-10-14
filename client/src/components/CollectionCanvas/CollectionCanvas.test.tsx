import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";
import CollectionCanvas from "./CollectionCanvas";

function CollectionRoutes() {
  const navigate = useNavigate();
  return (
    <>
      <button type="button" onClick={() => navigate("/")}>
        Leave collection
      </button>
      <Routes>
        <Route path="/" element={<p>Home view</p>} />
        <Route path="/collection" element={<CollectionCanvas />} />
      </Routes>
    </>
  );
}

function renderCollection() {
  window.history.replaceState(
    {},
    "",
    "/collection?collection_request_type=artists",
  );
  render(
    <MemoryRouter
      initialEntries={["/collection?collection_request_type=artists"]}
    >
      <CollectionRoutes />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

test("leaving during the profile request prevents a later top-list request", async () => {
  let releaseProfile: (response: Response) => void = () => {};
  const profileResponse = new Promise<Response>((resolve) => {
    releaseProfile = resolve;
  });
  const requestSignals: AbortSignal[] = [];
  const fetchMock = vi.fn(
    (_input: RequestInfo | URL, options?: RequestInit) => {
      if (options?.signal) requestSignals.push(options.signal);
      return profileResponse;
    },
  );
  vi.stubGlobal("fetch", fetchMock);

  renderCollection();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
  await userEvent.click(
    screen.getByRole("button", { name: "Leave collection" }),
  );
  expect(screen.getByText("Home view")).toBeVisible();
  expect(requestSignals[0]?.aborted).toBe(true);

  await act(async () => {
    releaseProfile(
      Response.json({ id: "listener", display_name: "Listener", images: [] }),
    );
    await profileResponse;
  });
  expect(fetchMock).toHaveBeenCalledOnce();
  expect(document.querySelector("canvas")).toBeNull();
});

test("leaving during pagination stops the next page and canvas creation", async () => {
  let releaseSecondPage: (response: Response) => void = () => {};
  const secondPage = new Promise<Response>((resolve) => {
    releaseSecondPage = resolve;
  });
  const pageSignals: AbortSignal[] = [];
  const fetchMock = vi.fn((input: RequestInfo | URL, options?: RequestInit) => {
    const url = String(input);
    if (url === "/api/me") {
      return Promise.resolve(
        Response.json({ id: "listener", display_name: "Listener", images: [] }),
      );
    }
    if (url.includes("offset=0")) {
      return Promise.resolve(
        Response.json({
          items: Array.from({ length: 50 }, (_, index) => ({
            id: `artist-${index}`,
            images: [{ url: "artwork.png" }],
          })),
          next: "/api/top/artists?offset=50",
        }),
      );
    }
    if (options?.signal) pageSignals.push(options.signal);
    return secondPage;
  });
  vi.stubGlobal("fetch", fetchMock);

  renderCollection();
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  await userEvent.click(
    screen.getByRole("button", { name: "Leave collection" }),
  );
  expect(screen.getByText("Home view")).toBeVisible();
  expect(pageSignals[0]?.aborted).toBe(true);

  await act(async () => {
    releaseSecondPage(
      Response.json({ items: [], next: "/api/top/artists?offset=100" }),
    );
    await secondPage;
  });
  expect(fetchMock).toHaveBeenCalledTimes(3);
  expect(document.querySelector("canvas")).toBeNull();
});
