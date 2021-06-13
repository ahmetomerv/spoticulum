const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const encodeFormData = require('../helperFunctions/encodeFormData.js');
const querystring = require('querystring');

router.get('/login', async (req, res) => {
	const scope =
	 `user-modify-playback-state
	 user-read-playback-state
	 user-read-currently-playing
	 user-library-modify
	 user-library-read
	 user-top-read
	 playlist-read-private
	 playlist-modify-public`;

	res.redirect('https://accounts.spotify.com/authorize?' +
		querystring.stringify({
		response_type: 'code',
		client_id: process.env.CLIENT_ID,
		scope: scope,
		redirect_uri: process.env.REDIRECTURI
	}));
});

router.get('/logged', async (req, res) => {
	const body = {
		grant_type: 'authorization_code',
		code: req.query.code,
		redirect_uri: process.env.REDIRECTURI,
		client_id: process.env.CLIENT_ID,
		client_secret: process.env.CLIENT_SECRET,
	}

	await fetch('https://accounts.spotify.com/api/token', {
		method: 'POST',
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"Accept": "application/json"
		},
		body: encodeFormData(body)
	})
	.then(response => response.json())
	.then(data => {
		const query = querystring.stringify(data);
		res.redirect(`${process.env.CLIENT_REDIRECTURI}?${query}`);
	});
});

router.get('/getUser/:token', async (req, res) => {
	await fetch('https://api.spotify.com/v1/me', {
		headers: {
			'Authorization': `Bearer ${req.params.token}`
		}
	})
	.then(response => response.json())
	.then(data => {
		res.json(data);
	});
});

// router.get('/playlists/:token', async (req, res) => {
// 	await fetch('https://api.spotify.com/v1/playlists', {
// 		headers: {
// 			'Authorization': `Bearer ${req.params.token}`
// 		}
// 	})
// 	.then(response => response.json())
// 	.then(data => {
// 		res.json(data);
// 	});
// });

module.exports = router;
