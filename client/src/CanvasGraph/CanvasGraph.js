import React from 'react';
import Spinner from './../Spinner';
import { Button } from 'semantic-ui-react';
import { createHiDPICanvas, initializeCanvasGradient, drawCell, downloadCanvasImage } from '../helpers/canvasHelpers';

class CanvasGraph extends React.Component {

	state = {
		mediaEntities: this.props.mediaEntities,
		user: this.props.user,
		isLoading: true,
		graphIsReady: false,
		imgResults: [],
		canvas: null,
	}

	componentDidMount() {
		if (this.state.mediaEntities && this.state.mediaEntities.length && this.state.user) {
			this.createSpotifyGraph();
		}
	}

	imgLoadCallback = (status) => {
		this.setState({
			imgResults: [...this.state.imgResults, status],
		}, () => {
			const xCells = 8;
			const yCells = 8;
			const profileCells = 4;

			if (this.state.imgResults.length === xCells * yCells - (profileCells - 1)) {
				this.setState({
					graphIsReady: this.state.imgResults.every(x => x)
				});
			}
		});
	}

	handleDownloadGraphClick = () => {
		if (this.state.canvas) {
			downloadCanvasImage(this.state.canvas, this.state.user.display_name);
		}
	}

	createSpotifyGraph = () => {
		const width = 700;
		const height = 700;
		const cellWidth = 70;
		const cellHeight = 70;
		const cellSize = (cellWidth + cellHeight) / 2;
		const profileCellSize = 140;
		const canvas = createHiDPICanvas(width, height);
		this.setState({ canvas: canvas });
		let context = canvas.getContext('2d');
		const p = context.lineWidth / 3;
		let canvasTarget = document.getElementById('canvas') || document.body;

		canvasTarget.appendChild(canvas);
		context.strokeStyle = "white";
		context.lineWidth = 5;

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
    
		initializeCanvasGradient(context, width, height, '#EFFFFE', '#11233E');
    
		let yCells = 9;
		let xCells = 9;
		let gridCenterCellsCount = 4;
		let steps = (xCells * yCells) - gridCenterCellsCount;
		
		let startingXCell = 3;
		let startingYCell = 3;
		let bgColor = '11233E';

		let stepsToTakeRight = 3;
		let stepsToTakeBottom = 3;
		let stepsToTakeLeft = 3;
		let stepsToTakeTop = 3;
		let stepsBaseCount = 3;
		
		let rightStepLastCell = { x: 0, y: 0 };
		let bottomStepLastCell = { x: 0, y: 0 };
		let leftStepLastCell = { x: 0, y: 0 };
		let topStopLastCell = { x: 0, y: 0 };
		
		let stepCounter = 0;
		let stepsToTake = stepsToTakeRight + stepsToTakeBottom + stepsToTakeLeft + stepsToTakeTop;
	
		let rowsCount = 4;
		let cellIndexCounter = 0;

		const profileUrl = this.state.user.images[0].url;
		drawCell(2, 2, bgColor, context, p, profileUrl, profileCellSize, this.imgLoadCallback);
    
		for (let z = 0; z < rowsCount; z++) {
			for (let i = 0; i < stepsToTake; i++) {
				if (stepsToTakeRight !== 0) {
					let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
						? this.state.mediaEntities[cellIndexCounter].images[0].url
						: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

					drawCell(startingXCell + i, startingYCell, bgColor, context, p, imgUrl, cellSize, this.imgLoadCallback);
					cellIndexCounter++;
					stepsToTakeRight--;

					if (stepsToTakeRight === 0) {
						rightStepLastCell.x = startingXCell + i + 1;
						rightStepLastCell.y = startingYCell;
					}
				}

				if (stepsToTakeBottom !== 0 && stepsToTakeRight === 0) {
					let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
						? this.state.mediaEntities[cellIndexCounter].images[0].url
						: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

					drawCell(rightStepLastCell.x, startingYCell + stepCounter, bgColor, context, p, imgUrl, cellSize, this.imgLoadCallback);
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
					let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
						? this.state.mediaEntities[cellIndexCounter].images[0].url
						: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

					drawCell(bottomStepLastCell.x + stepCounter, bottomStepLastCell.y, bgColor, context, p, imgUrl, cellSize, this.imgLoadCallback);
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
					let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
						? this.state.mediaEntities[cellIndexCounter].images[0].url
						: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

					drawCell(leftStepLastCell.x, leftStepLastCell.y - stepCounter, bgColor, context, p, imgUrl, cellSize, this.imgLoadCallback);
					cellIndexCounter++;
					stepCounter++;
					stepsToTakeTop--;

					if (stepsToTakeTop === 0) {
						topStopLastCell.x = leftStepLastCell.x;
						topStopLastCell.y = leftStepLastCell.y - stepCounter;
						stepCounter = 0;
					}
				}
			}

			if (cellIndexCounter < 60) {  
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
			} else {
				break;
			}

		}

		const logo = new Image();
		logo.src = 'spotify-logo.png';
		logo.onload = () => {
			context.drawImage(
				logo,
				70 + p, height - 60,
				30, 30
			);

			context.fillStyle = '#46596C';
			context.font = 'normal 14px Roboto';
			context.fillText('spoticulum.xyz', 110 + p, height - 42);

			context.fillStyle = '#CCDCE0';
			context.font = 'italic 14px Roboto';
			context.fillText(this.state.user.display_name, width - 150 + p, height - 42);
			this.setState({ isLoading: false });
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
		return (
			<React.Fragment>
				{ this.state.isLoading ? <Spinner/> : null }
				<div className="canvas-container">
					<div id="canvas"></div>

					<div className="canvas-actions-container">
						{ this.state.graphIsReady
							? <a onClick={this.handleDownloadGraphClick} className="button primary-button">Download Graph</a> 
							: <Button className="button loading-button" basic loading>Loading images...</Button>
						}
					</div>
				</div>
			</React.Fragment>
		)
	}

}

export default CanvasGraph;
