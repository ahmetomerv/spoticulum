import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import AuthRoutes from './routes/authRoutes.js';

const PORT = process.env.PORT || 8888;
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true}));
app.use(cors());
app.use('/api', cors(), AuthRoutes);

app.listen(PORT, () => {
	console.log(`Server started on port ${PORT}`);
});

if (process.env.NODE_ENV === 'production') {
	app.use(express.static('client/build'))
}
