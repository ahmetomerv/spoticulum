export default function mediaEntityMapper(entity) {
	return {
    ...entity,
    images: entity.images ? entity.images : entity.album.images,
	};
}
