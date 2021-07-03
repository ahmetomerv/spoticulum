import React from 'react';
import { Button } from 'semantic-ui-react';
import { createHiDPICanvas, initializeCanvasGradient, drawCell, downloadCanvasImage } from '../../helpers/canvasHelpers';
import './style.css';

class CanvasGraph extends React.Component {

	state = {
		mediaEntities: this.props.mediaEntities,
		user: this.props.user,
		graphIsReady: false,
		imgResults: [],
		canvas: null,
		requestedMediaType: this.props.requestedType,
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
			const xRowCells = 8;
			const yRowCells = 8;
			const profileCells = 4;

			if (this.state.imgResults.length === xRowCells * yRowCells - (profileCells - 1)) {
				this.setState({
					graphIsReady: this.state.imgResults.every(x => x),
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
    
		initializeCanvasGradient(context, width, height, '#EFFFFE', '#11233E');

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

		const profileUrl = this.state.user.images[0].url;
		drawCell(2, 2, null, context, padding, profileUrl, profileCellSize, this.imgLoadCallback);

		let myLoop;

		(myLoop = (z) => {
      setTimeout(() => {
        for (let i = 0; i < stepsToTake; i++) {
          if (stepsToTakeRight !== 0) {
            let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
							? this.state.mediaEntities[cellIndexCounter].images[0].url
							: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

            drawCell(startingXCell + i, startingYCell, null, context, padding, imgUrl, cellSize, this.imgLoadCallback);
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
            let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
							? this.state.mediaEntities[cellIndexCounter].images[0].url
							: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

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
            let imgUrl = this.state.mediaEntities[cellIndexCounter] && this.state.mediaEntities[cellIndexCounter].images.length
							? this.state.mediaEntities[cellIndexCounter].images[0].url
							: this.getRandomMediaEntityImgUrl(this.state.mediaEntities);

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
        if (--z) myLoop(z);
      }, 500);
    })(rowsCount);

		const logo = new Image();
		logo.src = 'spoticulum-logo.png';
		logo.onload = () => {
			context.drawImage(
				logo,
				70 + padding, height - 60,
				30, 30
			);

			context.fillStyle = '#46596C';
			context.font = 'normal 14px sans-serif';
			context.fillText('spoticulum.xyz', 110 + padding, height - 42);

			context.fillStyle = '#CCDCE0';
			context.font = 'italic 14px sans-serif';
			context.fillText(this.state.user.display_name, width - 150 + padding, height - 42);
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
		const { graphIsReady } = this.state;

		return (
			<React.Fragment>
				<div className="canvas-container">
					<div className="canvas-content">
						<h1>Your top { this.props.requestedMediaType === 'tracks' ? 'albums' : this.props.requestedMediaType }:</h1>
						<div id="canvas"></div>
						<div className="canvas-actions-container">
							{ graphIsReady
								? <button onClick={this.handleDownloadGraphClick} className="button primary-button">Download Graph</button> 
								: <Button disabled className="button loading-button" basic loading>Loading images...</Button>
							}
						</div>
					</div>
				</div>
			</React.Fragment>
		)
	}

}

export default CanvasGraph;
