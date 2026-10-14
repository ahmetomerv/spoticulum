import { act, render, screen, waitFor, within } from "@testing-library/react";
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
            name: `Artist ${index}`,
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

test("an empty top list stops pagination and offers a way home", async () => {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    Response.json(
      String(input) === "/api/me"
        ? { id: "listener", display_name: "Listener", images: [] }
        : {
            items: [],
            next: "https://api.spotify.com/v1/me/top/artists?offset=50",
          },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);

  renderCollection();
  expect(
    await screen.findByRole("heading", { name: "No collection data yet" }),
  ).toBeVisible();
  expect(screen.getByText(/no top artists/i)).toBeVisible();
  expect(screen.getByRole("status")).toHaveTextContent(
    /Return Home and try the other collection/,
  );
  expect(
    screen.queryByRole("button", { name: "Download Collection" }),
  ).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await userEvent.click(screen.getByRole("button", { name: "Home" }));
  expect(screen.getByText("Home view")).toBeVisible();
});

test("malformed top-list JSON shows a controlled error", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      Response.json(
        String(input) === "/api/me"
          ? { id: "listener", display_name: "Listener", images: [] }
          : { items: {}, next: null },
      ),
    ),
  );

  renderCollection();
  expect(
    await screen.findByText(/Invalid Spotify collection data/),
  ).toBeVisible();
  expect(screen.getByRole("alert")).toHaveTextContent(
    /Return Home and try again/,
  );
  expect(screen.getByRole("button", { name: "Home" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Download Collection" }),
  ).toBeNull();
});

test("a collection request failure announces an action to take", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === "/api/me")
        return Response.json({
          id: "listener",
          display_name: "Listener",
          images: [],
        });
      throw new Error("Network unavailable");
    }),
  );

  renderCollection();
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("Network unavailable");
  expect(alert).toHaveTextContent("Return Home and try again.");
  expect(screen.getByRole("button", { name: "Home" })).toBeVisible();
});

test("exposes artwork names and one collection loading status", async () => {
  const gradient = { addColorStop: vi.fn() };
  const context = {
    setTransform: vi.fn(),
    createLinearGradient: () => gradient,
    fillRect: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineWidth: 5,
  } as unknown as CanvasRenderingContext2D;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    () => context,
  );
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) =>
      Response.json(
        String(input) === "/api/me"
          ? { id: "listener", display_name: "Listener", images: [] }
          : {
              items: [
                { id: "one", name: "Artist One", images: [{ url: "one.png" }] },
                { id: "two", name: "Artist Two", images: [] },
              ],
              next: null,
            },
      ),
    ),
  );

  renderCollection();
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Creating your artists collection.",
    ),
  );
  const artworkList = await screen.findByRole("list", {
    name: "Artists whose artwork appears",
  });
  expect(
    screen.getByRole("heading", { name: "Your top artists" }),
  ).toBeVisible();
  expect(
    screen.getByText(/A square collage of artist artwork/),
  ).toBeInTheDocument();
  expect(within(artworkList).getAllByRole("listitem")).toHaveLength(1);
  expect(artworkList).toHaveTextContent("Artist One");
  expect(artworkList).not.toHaveTextContent("Artist Two");
  expect(document.querySelector("#canvas")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  expect(
    screen.queryByRole("button", { name: "Download Collection" }),
  ).not.toBeInTheDocument();
});
