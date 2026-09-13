export const updateDocumentTitle = (title) => {
  if (title) {
    document.title = 'Spoticulum of ' + title;
  }
}

export const getRandomColor = () => {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  const hexR = r.toString(16).padStart(2, '0');
  const hexG = g.toString(16).padStart(2, '0');
  const hexB = b.toString(16).padStart(2, '0');

  const hexColor = `#${hexR}${hexG}${hexB}`;

  return hexColor;
}
