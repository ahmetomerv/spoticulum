const getPixelRatio = () => {
	const
		context = document.createElement('canvas').getContext('2d'),
		dpr = window.devicePixelRatio || 1,
		bsr = context.webkitBackingStorePixelRatio ||
		context.mozBackingStorePixelRatio ||
		context.msBackingStorePixelRatio ||
		context.oBackingStorePixelRatio ||
		context.backingStorePixelRatio || 1;

	return dpr / bsr;
};

export const createHiDPICanvas = (width, height, ratio) => {
	width = width || window.innerWidth;
	height = height || window.innerHeight;
	const canvasElement = document.createElement('canvas');

	if (!ratio) {
		ratio = getPixelRatio();
	}

	canvasElement.width = width * ratio;
	canvasElement.height = height * ratio;
	canvasElement.style.width = width + 'px';
	canvasElement.style.height = height + 'px';
	canvasElement.getContext('2d').setTransform(ratio, 0, 0, ratio, 0, 0);

	return canvasElement;
}

export const initializeCanvasGradient = (context, width, height, color1, color2) => {
	color1 = color1 || '#fff';
	color2 = color2 || '#000';
	width = width || window.innerWidth;
	height = height || window.innerHeight;
	const gradient = context.createLinearGradient(width, 0, 0, 0);

	gradient.addColorStop(1, color1);
	gradient.addColorStop(0, color2);

	context.fillStyle = gradient;
	context.fillRect(0, 0, width, height);
}

export const downloadCanvasImage = (canvas, name) => {
	name = name.toLowerCase().replace(' ', '') || '';
	const fileName = name ? (`${name}-spotify-collection.png`) : 'spotify-collection.png';

	if (canvas) {
		const data = canvas.toDataURL('image/png');
		const blob = dataURItoBlob(data);
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = fileName;
		link.click();
		URL.revokeObjectURL(url);
	}
};

function dataURItoBlob(dataURI) {
	const byteString = atob(dataURI.split(',')[1]);
	const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
	const arrayBuffer = new ArrayBuffer(byteString.length);
	const uint8Array = new Uint8Array(arrayBuffer);

	for (let i = 0; i < byteString.length; i++) {
		uint8Array[i] = byteString.charCodeAt(i);
	}

	return new Blob([arrayBuffer], { type: mimeString });
}

export const drawCell = (xCell, yCell, color = 'ff3', context, p, imgUrl, cellSize = 50, imgResultCallback) => {
	const x = xCell * cellSize;
	const y = yCell * cellSize;
	const img = new Image();
	let opacity = 0;

	img.setAttribute('crossorigin', '');
	img.onerror = function(error) {
		console.error(error);
		if (imgResultCallback) {
			imgResultCallback(error);
		}
	}
	
	img.onload = function() {
		img.id = 'canvas-image';
		document.body.appendChild(img);
		let tempImg = document.querySelector('#canvas-image');
		img.width = tempImg.width;
		img.height = tempImg.height;
		document.body.removeChild(tempImg);
		
		const imgSize = Math.min(img.width, img.height);
		const left = (img.width - imgSize) / 2;
		const top = (img.height - imgSize) / 2;
		
		if (imgUrl && imgUrl.length > 1) {

			(function fadeIn() {
				setTimeout(() => {
					context.globalAlpha = opacity;
					context.drawImage(
						img,
						left, top,
						imgSize, imgSize,
						x + p, y + p,
						cellSize - p * 2, cellSize - p * 2
					);

					opacity += 0.10;
					
					if (opacity < 1) {
						requestAnimationFrame(fadeIn);
					} else {
						if (imgResultCallback) {
							imgResultCallback(true);
						}
					}
				}, 40);
			})();
		}
	};
	
	img.src = imgUrl;
}
