import 'dotenv/config';
import { connectDB } from './config/db.js';
import app from './api/app.js';


const API_PORT = process.env.API_PORT || 3000

async function startServer(){
    try{
        console.log('Starting Evide Backend Server...')
        console.log('Connecting to database...')
        await connectDB();
        console.log('Database connected successfully')

        //Start API server
        app.listen(API_PORT, ()=>{
            console.log(`API Server running on http://localhost:${API_PORT}`);
            console.log(`Health check: http://localhost:${API_PORT}/health`);
            console.log(`DB Health: http://localhost:${API_PORT}/health/db`);
        })

        process.on('SIGTERM', ()=>{
            console.log('SIGTERM recieved, shutting down gracefully...');
            process.exit(0)
        });
    }catch(error){
        console.error('Failed to start server', error)
        process.exit(1);
    }
}

startServer()