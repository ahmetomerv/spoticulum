import express from 'express';
import encodeFormData from '../helpers/encodeFormData.js';
import querystring from 'querystring'
import fetch from "node-fetch";
const router = express.Router();

router.get('/login', async (req, res) => {
	const scope =
	 `
	 user-library-read
	 user-top-read
	 playlist-read-private
	 `;

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

export default router;
