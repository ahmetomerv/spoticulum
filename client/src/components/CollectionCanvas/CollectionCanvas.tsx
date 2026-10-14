import "./style.css";
import React from "react";
import {
  createHiDPICanvas,
  initializeCanvasGradient,
  drawCell,
  downloadCanvasImage,
} from "../../helpers/canvasHelpers";
import { updateDocumentTitle, getRandomColor } from "../../helpers/utils";
import mediaEntityMapper from "../../helpers/mediaEntityMapper";
import { withRouter } from "../../withRouter";
import { trackAnalyticsEvent } from "../../platform/analytics";
import { spotifyApi } from "../../helpers/spotifyApi";
import { SpotifyApiError } from "../../helpers/spotifyApi";
import { getBestSpotifyImageUrl } from "../../helpers/spotifyImages";
import { createCollectionArtworkPicker } from "../../helpers/collectionArtwork";
import { Button, Header, Segment } from "semantic-ui-react";
import type { RouterProps } from "../../types/navigation";
import type {
  CollectionRequestType,
  MediaEntity,
  SpotifyProfile,
  SpotifyTimeRange,
  SpotifyTopResponse,
} from "../../types/spotify";

interface CollectionCanvasState {
  collectionIsReady: boolean;
  canvas: HTMLCanvasElement | null;
  timeRange: SpotifyTimeRange;
  isLoading: boolean;
  error: Error | null;
  mediaEntities: MediaEntity[];
  collectionRequestType: CollectionRequestType | null;
  user: SpotifyProfile | null;
}

class CollectionCanvas extends React.Component<
  RouterProps,
  CollectionCanvasState
> {
  private readonly abortController = new AbortController();
  private disposed = false;
  private disposeDrawing: (() => void) | null = null;

  override state: CollectionCanvasState = {
    collectionIsReady: false,
    canvas: null,
    timeRange: "long_term",
    isLoading: false,
    error: null,
    mediaEntities: [],
    collectionRequestType: null,
    user: null,
  };

  override componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    const requestedType = params.get("collection_request_type");
    const collectionRequestType: CollectionRequestType | null =
      requestedType === "artists" || requestedType === "tracks"
        ? requestedType
        : null;
    const user = this.props.location?.state?.user;
    this.setState({ collectionRequestType, user: user || null }, async () => {
      if (this.disposed) return;
      if (user) {
        if (user.display_name) updateDocumentTitle(user.display_name);
        this.initializeCollectionData();
        return;
      }
      const authenticatedUser = await this.getAuthenticatedUser();
      if (!this.disposed && !this.state.error && authenticatedUser) {
        this.initializeCollectionData();
      }
    });
  }

  override componentWillUnmount() {
    this.disposed = true;
    this.abortController.abort();
    this.disposeDrawing?.();
    this.disposeDrawing = null;
  }

  initializeCollectionData = () => {
    if (this.disposed) return;
    const { collectionRequestType, timeRange } = this.state;
    const limit = 50;
    const minimumEntities = 60;
    let offset = 0;
    let mediaEntities: MediaEntity[] = [];

    const loadNextPage = () => {
      if (this.disposed) return;
      if (!collectionRequestType) {
        this.setState({
          error: new Error(
            "Choose artists or albums to generate a collection.",
          ),
        });
        return;
      }
      this.getTop(collectionRequestType, offset, limit, timeRange)
        .then((res) => {
          if (this.disposed) return;
          mediaEntities = [
            ...mediaEntities,
            ...res.items.map(mediaEntityMapper),
          ];
          if (res.next && mediaEntities.length < minimumEntities) {
            offset += limit;
            loadNextPage();
            return;
          }
          this.setState({ mediaEntities }, () => {
            if (!this.disposed) this.createSpotifyCollection();
          });
        })
        .catch((error) => {
          this.handleApiError(error);
        });
    };

    loadNextPage();
  };

  getAuthenticatedUser = () => {
    this.setState({ isLoading: true });
    return spotifyApi<SpotifyProfile>("/api/me", {
      signal: this.abortController.signal,
    })
      .then((data) => {
        if (this.disposed) return null;
        this.setState({ user: data });
        if (data && data.display_name) {
          updateDocumentTitle(data.display_name);
        }
        return data;
      })
      .catch((error) => {
        this.handleApiError(error);
        return null;
      })
      .finally(() => {
        if (!this.disposed) this.setState({ isLoading: false });
      });
  };

  handleApiError = (error: unknown) => {
    if (
      this.disposed ||
      (error instanceof Error && error.name === "AbortError")
    )
      return;
    if (error instanceof SpotifyApiError && error.status === 401) {
      this.props.navigate("/?auth_error=session_expired", { replace: true });
      return;
    }
    this.setState({
      error:
        error instanceof Error ? error : new Error("Spotify request failed"),
    });
  };

  getTop = (
    requestedType: CollectionRequestType,
    offset: number,
    limit: number,
    timeRange: SpotifyTimeRange,
  ): Promise<SpotifyTopResponse> => {
    this.setState({ isLoading: true });
    const params = new URLSearchParams({
      time_range: timeRange,
      offset: String(offset),
      limit: String(limit),
    });
    return spotifyApi<SpotifyTopResponse>(
      `/api/top/${requestedType}?${params}`,
      { signal: this.abortController.signal },
    ).finally(() => {
      if (!this.disposed) this.setState({ isLoading: false });
    });
  };

  goBackClickHandler = () => {
    const queryParams = new URLSearchParams(window.location.search);
    queryParams.delete("collection_request_type");
    const queryString = queryParams.toString();
    this.props.navigate(queryString ? "/?" + queryString : "/");
  };

  logoutClickHandler = () => {
    spotifyApi("/api/logout", {
      method: "POST",
      signal: this.abortController.signal,
    })
      .catch((error) => {
        if (
          !this.disposed &&
          !(error instanceof Error && error.name === "AbortError")
        )
          console.error(error);
      })
      .finally(() => {
        if (!this.disposed) window.location.href = "/";
      });
  };

  handleDownloadCollectionClick = () => {
    if (this.state.canvas) {
      downloadCanvasImage(
        this.state.canvas,
        this.state.user?.display_name || "",
      );
      trackAnalyticsEvent({
        category: "main",
        action: "download",
        label: "User has downloaded a profile collection",
      });
    }
  };

  createSpotifyCollection = () => {
    if (this.disposed) return;
    const pickArtwork = createCollectionArtworkPicker(this.state.mediaEntities);
    if (!pickArtwork) {
      this.setState({
        error: new Error(
          "No artwork is available for this collection. Return Home and try the other collection.",
        ),
      });
      return;
    }

    const width = 700;
    const height = 700;
    const cellWidth = 70;
    const cellHeight = 70;
    const cellSize = (cellWidth + cellHeight) / 2;
    const profileCellSize = cellSize * 2;
    const totalCells = (width / cellSize) * (height / cellSize);
    const rowsCount = 3;
    const canvas = createHiDPICanvas(width, height);

    this.setState({ canvas: canvas });
    const context = canvas.getContext("2d");
    if (!context) {
      this.setState({
        error: new Error("Canvas rendering is not supported by this browser."),
      });
      return;
    }
    let pendingCells = 0;
    let drawingScheduledComplete = false;
    let logoLoaded = false;
    let failed = false;
    let finalized = false;
    const cellDisposers: Array<() => void> = [];
    let rowTimeout: ReturnType<typeof setTimeout> | null = null;
    const failCollection = (message: string): void => {
      if (this.disposed || failed || finalized) return;
      failed = true;
      this.setState({ error: new Error(message) });
    };
    const tryFinalize = (): void => {
      if (
        this.disposed ||
        failed ||
        finalized ||
        !drawingScheduledComplete ||
        pendingCells > 0 ||
        !logoLoaded
      )
        return;
      try {
        context.globalAlpha = 1;
        context.drawImage(logo, 70 + padding, height - 60, 30, 30);
        context.fillStyle = secondGradientColor;
        context.font = "bold 15px sans-serif";
        context.fillText("spoticulum.ahmeto.com", 110 + padding, height - 42);
        context.fillStyle = firstGradientColor;
        context.font = "bold 15px sans-serif";
        context.fillText(
          this.state.user?.display_name || "",
          width - 185 + padding,
          height - 42,
        );
        finalized = true;
        this.setState({ collectionIsReady: true });
      } catch {
        failCollection(
          "The collection could not be completed. Return Home and try again.",
        );
      }
    };
    const drawCollectionCell = (
      x: number,
      y: number,
      imageUrl: string,
      size: number,
    ): void => {
      pendingCells++;
      const disposeCell = drawCell(
        x,
        y,
        null,
        context,
        padding,
        imageUrl,
        size,
        (result) => {
          if (this.disposed) return;
          pendingCells--;
          if (result === "failed") {
            failCollection(
              "An image could not be loaded. Return Home and try again.",
            );
          }
          tryFinalize();
        },
      );
      cellDisposers.push(disposeCell);
    };
    context.lineWidth = 5;
    const padding = context.lineWidth / 6;
    const canvasTarget = document.getElementById("canvas") || document.body;

    canvasTarget.appendChild(canvas);
    context.strokeStyle = "white";

    for (let i = 0; i <= 10; i++) {
      const x = i * cellHeight;
      context.moveTo(x, 0);
      context.lineTo(x, canvas.height);
      context.stroke();

      const y = i * cellWidth;
      context.moveTo(0, y);
      context.lineTo(canvas.width, y);
      context.stroke();
    }

    const firstGradientColor = getRandomColor();
    const secondGradientColor = getRandomColor();

    initializeCanvasGradient(
      context,
      width,
      height,
      firstGradientColor,
      secondGradientColor,
    );

    let startingXCell = 3;
    let startingYCell = 3;

    let stepsToTakeRight = 3;
    let stepsToTakeBottom = 3;
    let stepsToTakeLeft = 3;
    let stepsToTakeTop = 3;
    let stepsBaseCount = 3;

    const rightStepLastCell = { x: 0, y: 0 };
    const bottomStepLastCell = { x: 0, y: 0 };
    const leftStepLastCell = { x: 0, y: 0 };
    const topStepLastCell = { x: 0, y: 0 };

    let stepCounter = 0;
    let cellIndexCounter = 0;
    let stepsToTake =
      stepsToTakeRight + stepsToTakeBottom + stepsToTakeLeft + stepsToTakeTop;

    const profileUrl = getBestSpotifyImageUrl(
      this.state.user?.images,
      "spoticulum-logo.png",
    );

    drawCollectionCell(2, 2, profileUrl, profileCellSize);

    let canvasLoop: (remainingRows: number) => void;

    (canvasLoop = (z: number) => {
      rowTimeout = setTimeout(() => {
        rowTimeout = null;
        if (this.disposed) return;
        for (let i = 0; i < stepsToTake; i++) {
          if (stepsToTakeRight !== 0) {
            const imgUrl = pickArtwork(cellIndexCounter);

            drawCollectionCell(
              startingXCell + i,
              startingYCell,
              imgUrl,
              cellSize,
            );
            cellIndexCounter++;
            stepsToTakeRight--;

            if (stepsToTakeRight === 0) {
              rightStepLastCell.x = startingXCell + i + 1;
              rightStepLastCell.y = startingYCell;
            }
          }

          if (stepsToTakeBottom !== 0 && stepsToTakeRight === 0) {
            const imgUrl = pickArtwork(cellIndexCounter);

            drawCollectionCell(
              rightStepLastCell.x,
              startingYCell + stepCounter,
              imgUrl,
              cellSize,
            );
            cellIndexCounter++;
            stepCounter++;
            stepsToTakeBottom--;

            if (stepsToTakeBottom === 0) {
              bottomStepLastCell.x = rightStepLastCell.x;
              bottomStepLastCell.y = startingYCell + stepCounter;
              stepCounter = 0;
            }
          }

          if (stepsToTakeLeft !== 0 && stepsToTakeBottom === 0) {
            const imgUrl = pickArtwork(cellIndexCounter);

            drawCollectionCell(
              bottomStepLastCell.x + stepCounter,
              bottomStepLastCell.y,
              imgUrl,
              cellSize,
            );
            cellIndexCounter++;
            stepCounter--;
            stepsToTakeLeft--;

            if (stepsToTakeLeft === 0) {
              leftStepLastCell.x = bottomStepLastCell.x + stepCounter;
              leftStepLastCell.y = bottomStepLastCell.y;
              stepCounter = 0;
            }
          }

          if (stepsToTakeTop !== 0 && stepsToTakeLeft === 0) {
            const imgUrl = pickArtwork(cellIndexCounter);

            drawCollectionCell(
              leftStepLastCell.x,
              leftStepLastCell.y - stepCounter,
              imgUrl,
              cellSize,
            );
            cellIndexCounter++;
            stepCounter++;
            stepsToTakeTop--;

            if (stepsToTakeTop === 0) {
              topStepLastCell.x = leftStepLastCell.x;
              topStepLastCell.y = leftStepLastCell.y - stepCounter;
              stepCounter = 0;
            }
          }
        }

        if (cellIndexCounter < totalCells) {
          if (
            stepsToTakeTop === 0 &&
            stepsToTakeLeft === 0 &&
            stepsToTakeBottom === 0 &&
            stepsToTakeRight === 0
          ) {
            stepsBaseCount = stepsBaseCount + 2;
            startingXCell--;
            startingYCell--;
            stepsToTakeRight = stepsBaseCount;
            stepsToTakeBottom = stepsBaseCount;
            stepsToTakeLeft = stepsBaseCount;
            stepsToTakeTop = stepsBaseCount;
            stepsToTake =
              stepsToTakeRight +
              stepsToTakeBottom +
              stepsToTakeLeft +
              stepsToTakeTop;
          }
        }
        if (--z) canvasLoop(z);
        else {
          drawingScheduledComplete = true;
          tryFinalize();
        }
      }, 900);
    })(rowsCount);

    const logo = new Image();
    const logoTimeout = setTimeout(() => {
      failCollection(
        "The collection logo could not be loaded. Return Home and try again.",
      );
    }, 15000);
    logo.onload = () => {
      if (this.disposed) return;
      clearTimeout(logoTimeout);
      logoLoaded = true;
      tryFinalize();
    };
    logo.onerror = () => {
      if (this.disposed) return;
      clearTimeout(logoTimeout);
      failCollection(
        "The collection logo could not be loaded. Return Home and try again.",
      );
    };
    logo.src = "spoticulum-logo.png";
    this.disposeDrawing = () => {
      if (rowTimeout !== null) clearTimeout(rowTimeout);
      clearTimeout(logoTimeout);
      logo.onload = null;
      logo.onerror = null;
      logo.removeAttribute("src");
      cellDisposers.forEach((disposeCell) => disposeCell());
      canvas.remove();
    };
  };

  override render() {
    const { collectionIsReady, error } = this.state;

    if (error) {
      return (
        <div className="canvas-container">
          <div className="canvas-content">
            <Header as="h1" block attached="top">
              Couldn't create your collection
            </Header>
            <Segment attached>
              <p>{error.message}</p>
              <Button onClick={() => this.props.navigate("/")}>Home</Button>
            </Segment>
          </div>
        </div>
      );
    }

    return (
      <React.Fragment>
        <div className="canvas-container">
          <div className="canvas-content">
            <Header as="h1" block attached="top">
              &#128189; Your top{" "}
              {this.state.collectionRequestType === "tracks"
                ? "albums"
                : this.state.collectionRequestType}
              <p
                style={{
                  fontSize: ".5em",
                  fontWeight: "normal",
                  color: "#5f5f5f",
                }}
              >
                Here's your collection of what you listened to the most for the
                last year.
              </p>
            </Header>
            <Segment attached>
              <div id="canvas"></div>
              <div className="canvas-actions-container">
                {collectionIsReady ? (
                  <React.Fragment>
                    <Button negative onClick={this.logoutClickHandler}>
                      Log out
                    </Button>
                    <Button
                      style={{ margin: "0 1em" }}
                      onClick={this.handleDownloadCollectionClick}
                      positive
                    >
                      Download Collection
                    </Button>
                    <Button onClick={this.goBackClickHandler}>Go Back</Button>
                  </React.Fragment>
                ) : (
                  <Button
                    disabled
                    className="button loading-button"
                    basic
                    loading
                  >
                    Loading images...
                  </Button>
                )}
              </div>
            </Segment>
            <div className="tip-text-container">
              {collectionIsReady ? (
                <p className="tip-text">
                  Tip: Background colors are automatically generated. You can
                  redo it to see different colors.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

export default withRouter(CollectionCanvas);
