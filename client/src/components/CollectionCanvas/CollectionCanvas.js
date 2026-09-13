import './style.css';
import React from 'react';
import { createHiDPICanvas, initializeCanvasGradient, drawCell, downloadCanvasImage } from '../../helpers/canvasHelpers';
import { updateDocumentTitle, getRandomColor } from '../../helpers/utils';
import mediaEntityMapper from '../../helpers/mediaEntityMapper';
import { withRouter } from '../../withRouter';
import { trackAnalyticsEvent } from '../../platform/analytics';
import { spotifyApi } from '../../helpers/spotifyApi';
import { Button, Header, Segment } from 'semantic-ui-react'

class CollectionCanvas extends React.Component {

	state = {
		collectionIsReady: false,
		imgResults: [],
		canvas: null,
		timeRange: 'long_term',
		isLoading: false,
		error: null,
			mediaEntities: [],
		}

	componentDidMount() {
		const params = new URLSearchParams(window.location.search);
		const collectionRequestType = params.get('collection_request_type');
		this.setState({ collectionRequestType }, async () => {
			const user = await this.getAuthenticatedUser();
			if (!this.state.error && user) {
				this.initializeCollectionData();
			}
		});
	}

	initializeCollectionData = () => {
		const { collectionRequestType, timeRange } = this.state;
		const limit = 50;
		const minimumEntities = 60;
		let offset = 0;
		let mediaEntities = [];

		const loadNextPage = () => {
			this.getTop(collectionRequestType, offset, limit, timeRange)
				.then(res => {
					mediaEntities = [...mediaEntities, ...res.items.map(mediaEntityMapper)];
					if (res.next && mediaEntities.length < minimumEntities) {
						offset += limit;
						loadNextPage();
						return;
					}
					this.setState({ mediaEntities }, () => this.createSpotifyCollection());
				})
				.catch(error => {
					this.handleApiError(error);
				});
		}

		loadNextPage();
	}

	getAuthenticatedUser = () => {
		this.setState({ isLoading: true });
			return spotifyApi('/api/me')
				.then(data => {
					this.setState({ user: data });
					if (data && data.display_name) {
						updateDocumentTitle(data.display_name);
					}
					return data;
				})
				.catch(error => {
					this.handleApiError(error);
					return null;
				})
			.finally(() => {
				this.setState({ isLoading: false });
			});
	}

	handleApiError = (error) => {
		if (error.status === 401) {
			this.props.navigate('/?auth_error=session_expired', { replace: true });
			return;
		}
		this.setState({ error });
	}

		getTop = (requestedType, offset, limit, timeRange) => {
		this.setState({ isLoading: true });
		const params = new URLSearchParams({
			time_range: timeRange,
			offset: String(offset),
			limit: String(limit),
		});
		return spotifyApi(`/api/top/${requestedType}?${params}`)
			.finally(() => {
				this.setState({ isLoading: false });
			});
	}

	goBackClickHandler = () => {
    const queryParams = new URLSearchParams(window.location.search);
    this.props.navigate('/?' + queryParams.toString());
	}

	logoutClickHandler = () => {
		spotifyApi('/api/logout', { method: 'POST' })
			.catch(error => console.error(error))
			.finally(() => {
				window.location.href = '/';
			});
	}

	imgLoadCallback = (status) => {
		this.setState(prevState => {
			const updatedImgResults = [...prevState.imgResults, status];
			const xRowCells = 8;
			const yRowCells = 8;
			const profileCells = 4;
		
			let updatedCollectionIsReady = prevState.collectionIsReady;
		
			if (updatedImgResults.length >= xRowCells * yRowCells - (profileCells - 1)) {
				updatedCollectionIsReady = updatedImgResults.every(x => x);
			}
		
			return {
				imgResults: updatedImgResults,
				collectionIsReady: updatedCollectionIsReady,
			};
		});
	}

	handleDownloadCollectionClick = () => {
		if (this.state.canvas) {
			downloadCanvasImage(this.state.canvas, this.state.user.display_name);
			trackAnalyticsEvent({
				category: 'main',
				action: 'download',
				label: 'User has downloaded a profile collection',
			});
		}
	}

	createSpotifyCollection = () => {
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
		let context = canvas.getContext('2d');
		context.lineWidth = 5;
		const padding = context.lineWidth / 6;
		let canvasTarget = document.getElementById('canvas') || document.body;

		canvasTarget.appendChild(canvas);
		context.strokeStyle = 'white';

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

		initializeCanvasGradient(context, width, height, firstGradientColor, secondGradientColor);

		let startingXCell = 3;
		let startingYCell = 3;

		let stepsToTakeRight = 3;
		let stepsToTakeBottom = 3;
		let stepsToTakeLeft = 3;
		let stepsToTakeTop = 3;
		let stepsBaseCount = 3;
		
		let rightStepLastCell = { x: 0, y: 0 };
		let bottomStepLastCell = { x: 0, y: 0 };
		let leftStepLastCell = { x: 0, y: 0 };
		let topStepLastCell = { x: 0, y: 0 };
		
		let stepCounter = 0;
    let cellIndexCounter = 0;
		let stepsToTake = stepsToTakeRight + stepsToTakeBottom + stepsToTakeLeft + stepsToTakeTop;

		let profileUrl;

		if (this.state.user.images.length > 1) {
			profileUrl = this.state.user.images[1].url;
		} else if (this.state.user.images.length > 0) {
			profileUrl = this.state.user.images[0].url;
		} else {
			profileUrl = 'spoticulum-logo.png';
		}

		drawCell(2, 2, null, context, padding, profileUrl, profileCellSize, this.imgLoadCallback);

		let canvasLoop;

		(canvasLoop = (z) => {
      setTimeout(() => {
				const { mediaEntities } = this.state;
        for (let i = 0; i < stepsToTake; i++) {
          if (stepsToTakeRight !== 0) {
						let imgUrl = '';
						if (mediaEntities[cellIndexCounter] && mediaEntities[cellIndexCounter].images.length) {
							imgUrl = mediaEntities[cellIndexCounter].images[0].url;
						} else {
							imgUrl = this.getRandomMediaEntityImgUrl(mediaEntities);
						}

            drawCell(startingXCell + i, startingYCell, null, context, padding, imgUrl, cellSize, this.imgLoadCallback);
            cellIndexCounter++;
            stepsToTakeRight--;

            if (stepsToTakeRight === 0) {
              rightStepLastCell.x = startingXCell + i + 1;
              rightStepLastCell.y = startingYCell;
            }
          }

          if (stepsToTakeBottom !== 0 && stepsToTakeRight === 0) {
            let imgUrl = '';
						if (mediaEntities[cellIndexCounter] && mediaEntities[cellIndexCounter].images.length) {
							imgUrl = mediaEntities[cellIndexCounter].images[0].url;
						} else {
							imgUrl = this.getRandomMediaEntityImgUrl(mediaEntities);
						}

            drawCell(rightStepLastCell.x, startingYCell + stepCounter, null, context, padding, imgUrl, cellSize, this.imgLoadCallback);
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
            let imgUrl = '';
						if (mediaEntities[cellIndexCounter] && mediaEntities[cellIndexCounter].images.length) {
							imgUrl = mediaEntities[cellIndexCounter].images[0].url;
						} else {
							imgUrl = this.getRandomMediaEntityImgUrl(mediaEntities);
						}

            drawCell(bottomStepLastCell.x + stepCounter, bottomStepLastCell.y, null, context, padding, imgUrl, cellSize, this.imgLoadCallback);
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
            let imgUrl = '';
						if (mediaEntities[cellIndexCounter] && mediaEntities[cellIndexCounter].images.length) {
							imgUrl = mediaEntities[cellIndexCounter].images[0].url;
						} else {
							imgUrl = this.getRandomMediaEntityImgUrl(mediaEntities);
						}

            drawCell(leftStepLastCell.x, leftStepLastCell.y - stepCounter, null, context, padding, imgUrl, cellSize, this.imgLoadCallback);
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
          if (stepsToTakeTop === 0 && stepsToTakeLeft === 0 && stepsToTakeBottom === 0 && stepsToTakeRight === 0) {
            stepsBaseCount = stepsBaseCount + 2;
            startingXCell--;
            startingYCell--;
            stepsToTakeRight = stepsBaseCount;
            stepsToTakeBottom = stepsBaseCount;
            stepsToTakeLeft = stepsBaseCount;
            stepsToTakeTop = stepsBaseCount;
            stepsToTake = stepsToTakeRight + stepsToTakeBottom + stepsToTakeLeft + stepsToTakeTop;
          }
        }
        if (--z) canvasLoop(z);
      }, 900);
    })(rowsCount);

		const logo = new Image();
		logo.src = 'spoticulum-logo.png';
		logo.onload = () => {
			context.drawImage(
				logo,
				70 + padding, height - 60,
				30, 30
			);

			context.fillStyle = secondGradientColor;
			context.font = 'bold 15px sans-serif';
			context.fillText('spoticulum.xyz', 110 + padding, height - 42);

			context.fillStyle = firstGradientColor;
			context.font = 'bold 15px sans-serif';
			context.fillText(this.state.user.display_name, width - 185 + padding, height - 42);
		}
	}
	
	getRandomMediaEntityImgUrl = (mediaEntities) => {
		if (mediaEntities) {
			const randomNum = (Math.floor(Math.random() * mediaEntities.length - 1));
			let imgUrl;

			if (mediaEntities[randomNum] && mediaEntities[randomNum].images.length && mediaEntities[randomNum].images[0]) {
				imgUrl = mediaEntities[randomNum].images[0].url;
			} else {
				imgUrl = this.getRandomMediaEntityImgUrl(mediaEntities);
			}

			return imgUrl;
		}

		return '';
   }

	render() {
		const { collectionIsReady, error } = this.state;

		if (error) {
			return (
				<div className="canvas-container">
					<div className="canvas-content">
						<Header as='h1' block attached='top'>Spotify session problem</Header>
						<Segment attached>
							<p>{error.message}</p>
							<Button onClick={() => this.props.navigate('/')}>Home</Button>
						</Segment>
					</div>
				</div>
			)
		}

		return (
			<React.Fragment>
				<div className="canvas-container">
					<div className="canvas-content">
						<Header as='h1' block attached='top'>
							&#128189; Your top { this.state.collectionRequestType === 'tracks' ? 'albums' : this.state.collectionRequestType }
							<p style={{ fontSize: '.5em', fontWeight: 'normal', color: '#5f5f5f' }}>Here's your collection of what you listened to the most for the last year.</p>
						</Header>
						<Segment attached>
							<div id="canvas"></div>
							<div className="canvas-actions-container">
								{ collectionIsReady
									? (
										<React.Fragment>
											<Button negative onClick={this.logoutClickHandler}>Log out</Button>
											<Button style={{ margin: '0 1em' }} onClick={this.handleDownloadCollectionClick} positive>Download Collection</Button>
											<Button onClick={this.goBackClickHandler}>Go Back</Button>
										</React.Fragment>
									) 
									: <Button disabled className="button loading-button" basic loading>Loading images...</Button>
								}
							</div>
						</Segment>
						<div className='tip-text-container'>
							{ collectionIsReady ? <p className='tip-text'>Tip: Background colors are automatically generated. You can redo it to see different colors.</p> : null}
						</div>
					</div>
				</div>
			</React.Fragment>
		)
	}
}

export default withRouter(CollectionCanvas);
